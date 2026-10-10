// One-shot staging persistence round-trip. PREPARED ONLY — do not run
// without explicit approval. Never runs in production, never touches a
// database unless every safeguard below passes.
//
// What it does:
//   1. Refuses unless STAGING_ROUNDTRIP=1 and NODE_ENV is not production.
//   2. Connects read-only first and positively identifies the staging
//      database (expected name + Neon host suffix). Anything else aborts.
//   3. Creates ONE fictional incident through PrismaIncidentStore (the same
//      Zod validation, state machine, and idempotency rules the API uses),
//      exercises location + status + triage writes, reads everything back.
//   4. Deletes ONLY the rows it created (verified IDs, FK-safe order) and
//      asserts zero remain. On any failure it prints the exact manual
//      cleanup SQL for the single incident ID — never a broad delete.
//
// Expected new rows (all fictional, all removed afterwards):
//   Incident x1, StatusEvent x2, TriageResult x3, IdempotencyKey x3 = 9 rows.
// Prints markers, IDs, and counts only. Never prints connection strings,
// passwords, tokens, or secrets.

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const RUN = randomUUID();
const MARKER = "[ROUNDTRIP-PROBE]";
const IDEMPOTENCY_KEY = `roundtrip-${RUN}`;

function loadLocalEnv(): void {
  // Explicit .env parsing so the script does not depend on implicit loader
  // behavior. Values stay in memory; only check results are printed.
  try {
    const lines = readFileSync(".env", "utf8").split("\n");
    for (const line of lines) {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match && process.env[match[1]] === undefined) {
        // Strip wrapping quotes and any Windows carriage return.
        process.env[match[1]] = match[2].replace(/\r$/, "").replace(/^"|"$/g, "");
      }
    }
  } catch {
    // No .env file: fall back to the ambient environment.
  }
}

// Connection strings must never reach output, even inside error text.
function redact(value: string): string {
  return value.replace(/postgres(?:ql)?:\/\/[^@\s]+@[^\s"'`]+/gi, "postgres://[redacted]");
}

function fail(stage: string, message: string, extra?: Record<string, unknown>): never {
  console.log(JSON.stringify({ ok: false, stage, message, ...extra }));
  process.exit(1);
}

async function main(): Promise<void> {
  loadLocalEnv();

  // --- Safeguard 1: explicit opt-in flag. ---
  if (process.env["STAGING_ROUNDTRIP"] !== "1") {
    fail("guard-flag", "Refusing: set STAGING_ROUNDTRIP=1 to run this staging test.");
  }

  // --- Safeguard 2: never production. ---
  if (process.env["NODE_ENV"] === "production") {
    fail("guard-env", "Refusing: NODE_ENV is production.");
  }

  const dbUrl = process.env["DATABASE_URL"] ?? "";
  if (!dbUrl) fail("guard-env", "Refusing: DATABASE_URL is not set.");

  // --- Safeguard 3: positively identify the staging database. ---
  // Host and name are compared in memory; only booleans are printed.
  let hostOk = false;
  try {
    const host = new URL(dbUrl).hostname;
    hostOk = host.endsWith(process.env["STAGING_HOST_SUFFIX"] ?? "neon.tech");
  } catch {
    hostOk = false;
  }
  const { db } = await import("../lib/db");
  let dbName = "";
  try {
    const rows = (await db.$queryRawUnsafe("SELECT current_database() AS name")) as {
      name: string;
    }[];
    dbName = rows[0]?.name ?? "";
  } catch {
    fail("guard-connect", "Refusing: could not connect read-only to verify the target.");
  }
  const expectedDb = process.env["STAGING_EXPECTED_DB"] ?? "emergency";
  const nameOk = dbName === expectedDb;
  // Optional hardening: exact hostname pinning when STAGING_EXPECTED_HOST is set.
  const expectedHost = process.env["STAGING_EXPECTED_HOST"];
  let hostPinned = true;
  try {
    if (expectedHost) hostPinned = new URL(dbUrl).hostname === expectedHost;
  } catch {
    hostPinned = false;
  }
  console.log(JSON.stringify({ stage: "guard-target", hostOk, hostPinned, nameOk }));
  if (!hostOk || !hostPinned || !nameOk) {
    await db.$disconnect();
    fail("guard-target", "Refusing: target is not the intended staging database.");
  }

  const { PrismaIncidentStore } = await import("../lib/prisma-incident-store");
  const store = new PrismaIncidentStore(db);
  let incidentId: string | null = null;
  let step = "create";

  async function count(table: "StatusEvent" | "TriageResult" | "IdempotencyKey"): Promise<number> {
    if (!incidentId) return 0;
    const rows = (await db.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS n FROM "${table}" WHERE "incidentId" = $1`,
      incidentId,
    )) as { n: number }[];
    return rows[0]?.n ?? 0;
  }

  async function remainingCounts(): Promise<Record<string, number>> {
    return {
      statusEvents: await count("StatusEvent"),
      triageResults: await count("TriageResult"),
      idempotencyKeys: await count("IdempotencyKey"),
    };
  }

  async function cleanup(reason: string): Promise<never> {
    const safeReason = redact(reason);
    if (!incidentId) {
      console.log(
        JSON.stringify({ ok: false, stage: step, reason: safeReason, cleanup: "nothing-created" }),
      );
      await db.$disconnect();
      process.exit(1);
    }
    try {
      await db.$transaction([
        db.triageResult.deleteMany({ where: { incidentId } }),
        db.statusEvent.deleteMany({ where: { incidentId } }),
        db.idempotencyKey.deleteMany({ where: { incidentId } }),
        db.incident.delete({ where: { id: incidentId } }),
      ]);
      // Verify every table, not just one: only a full zero counts as removed.
      const gone = await store.getIncident(incidentId);
      const remaining = await remainingCounts();
      const total =
        remaining.statusEvents + remaining.triageResults + remaining.idempotencyKeys + (gone === null ? 0 : 1);
      if (total !== 0) throw new Error(`cleanup incomplete, ${total} row(s) remain`);
      console.log(
        JSON.stringify({ ok: false, stage: step, reason: safeReason, cleanup: "removed", remaining }),
      );
    } catch (cleanupError) {
      // Exact, narrowly scoped manual recovery: this incident ID only.
      // Both messages are redacted; a cleanup error is never success.
      const detail =
        cleanupError instanceof Error ? redact(cleanupError.message) : "cleanup failed";
      console.log(
        JSON.stringify({
          ok: false,
          stage: step,
          reason: safeReason,
          cleanup: "manual-required",
          cleanupDetail: detail,
          incidentId,
          manualSql: [
            `DELETE FROM "TriageResult" WHERE "incidentId" = '${incidentId}';`,
            `DELETE FROM "StatusEvent" WHERE "incidentId" = '${incidentId}';`,
            `DELETE FROM "IdempotencyKey" WHERE "incidentId" = '${incidentId}';`,
            `DELETE FROM "Incident" WHERE "id" = '${incidentId}';`,
            `-- Then verify: SELECT COUNT(*) FROM "StatusEvent" WHERE "incidentId" = '${incidentId}'; (expect 0)`,
          ],
        }),
      );
    }
    await db.$disconnect();
    process.exit(1);
  }

  try {
    // --- Step 1: create through the supported validated path. ---
    const created = await store.createIncident(
      {
        affectsSelf: true,
        emergencyType: `${MARKER} fictional persistence check`,
        triage: [],
        idempotencyKey: IDEMPOTENCY_KEY,
      },
      { reporter: null },
    );
    incidentId = created.id;
    if (created.status !== "REQUEST_STARTED") throw new Error("unexpected initial status");

    // --- Step 2: read back and verify persisted fields. ---
    step = "read-back";
    const read = await store.getIncident(incidentId);
    if (!read || read.emergencyType !== `${MARKER} fictional persistence check`) {
      throw new Error("read-back mismatch");
    }

    // --- Step 3: location write (exercises PostGIS geography write). ---
    step = "location";
    const located = await store.updateLocation(incidentId, {
      latitude: 0,
      longitude: 0,
      addressText: null,
      landmark: `${MARKER} fictional landmark`,
      locationState: "approximate",
    });
    if (located.location?.landmark !== `${MARKER} fictional landmark`) {
      throw new Error("location mismatch");
    }

    // --- Step 4: legal status transition. ---
    step = "status";
    const sent = await store.appendStatus(incidentId, "REQUEST_SENT", {
      source: "roundtrip-test",
      note: `${MARKER} probe event`,
      idempotencyKey: `${IDEMPOTENCY_KEY}-status`,
    });
    if (sent.status !== "REQUEST_SENT" || sent.events.length !== 2) {
      throw new Error("status mismatch");
    }

    // --- Step 5: triage write + server-side classification. ---
    step = "triage";
    const triaged = await store.submitTriage(
      incidentId,
      {
        answers: [
          { questionId: "responsive", answer: "yes" },
          { questionId: "breathing", answer: "yes" },
          { questionId: "bleeding", answer: "no" },
        ],
        rulesetVersion: "rapid-v1-draft",
        idempotencyKey: `${IDEMPOTENCY_KEY}-triage`,
      },
      { source: "roundtrip-test" },
    );
    if (triaged.urgency !== "URGENT" || triaged.incident.triageResults.length !== 3) {
      throw new Error("triage mismatch");
    }

    // --- Step 6: scoped cleanup (children first), then verify zero remain. ---
    step = "cleanup";
    const before = {
      incidents: 1,
      statusEvents: await count("StatusEvent"),
      triageResults: await count("TriageResult"),
      idempotencyKeys: await count("IdempotencyKey"),
    };
    await db.$transaction([
      db.triageResult.deleteMany({ where: { incidentId } }),
      db.statusEvent.deleteMany({ where: { incidentId } }),
      db.idempotencyKey.deleteMany({ where: { incidentId } }),
      db.incident.delete({ where: { id: incidentId } }),
    ]);
    const gone = await store.getIncident(incidentId);
    const remaining =
      (await count("StatusEvent")) +
      (await count("TriageResult")) +
      (await count("IdempotencyKey")) +
      (gone === null ? 0 : 1);
    if (remaining !== 0) {
      throw new Error("cleanup verification failed");
    }
    console.log(
      JSON.stringify({
        ok: true,
        stage: "done",
        incidentId,
        idempotencyKey: IDEMPOTENCY_KEY,
        rowsCreated: before,
        rowsRemaining: 0,
      }),
    );
    await db.$disconnect();
    process.exit(0);
  } catch (error) {
    await cleanup(error instanceof Error ? error.message : "unknown failure");
  }
}

main();
