// Guarded Better Auth sign-in/session round-trip for staging. PREPARED
// ONLY — do not run without explicit approval. Never runs in production,
// never touches a database unless every safeguard below passes.
//// Server procedure (same-database proof without a new endpoint): stop any
// running dev server, confirm the staging .env is loaded from the project
// root, then start exactly one server with `npm.cmd run dev` from the root.
// The script then creates the test user THROUGH that server and immediately
// counts it through the DIRECT database connection: a count other than 1
// proves the server is pointed elsewhere and aborts with no deletes, only
// a stray-row warning keyed by the run email.
// Exercises REAL session cookies over HTTP (no mocks, no browser needed:
// cookie issuance and validation are HTTP-level, which fetch covers fully).
//
// Flow (fictional identity only, never a real person):
//   sign-up -> session cookie asserts -> sign-in -> get-session asserts ->
//   RBAC proof (403 on staff list as BYSTANDER) -> owner-scoped incident
//   create/read -> sign-out -> session gone + 401/404 proofs -> scoped cleanup.
//
// Expected writes: User x1, Account x1, Session x2 (sign-up + sign-in; the
// sign-out deletes the sign-in session server-side, leftovers are removed
// by cleanup), Incident x1, StatusEvent x1, IdempotencyKey x1. All removed.
// Prints markers, IDs, counts, and booleans only. Never prints passwords,
// cookies, headers, connection strings, or secrets.

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const RUN = randomUUID().replace(/-/g, "").slice(0, 12);
const EMAIL = `roundtrip-auth-${RUN}@example.com`;
const PASSWORD = `${randomUUID()}${randomUUID()}Aa0!`;
const IDEMPOTENCY_KEY = `auth-roundtrip-${RUN}`;
const DEV_SECRET_PLACEHOLDER = "dev-only-replace-me-32-chars-minimum-please";

function loadLocalEnv(): void {
  try {
    for (const line of readFileSync(".env", "utf8").split("\n")) {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2].replace(/\r$/, "").replace(/^"|"$/g, "");
      }
    }
  } catch {
    // No .env file: fall back to the ambient environment.
  }
}

function redact(value: string): string {
  return value
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@[^\s"'`]+/gi, "postgres://[redacted]")
    .replace(/((?:credential|credential-auth|session[_-]?token|better-auth)[^;]*=)[^;\s]+/gi, "$1[redacted]");
}

function fail(stage: string, message: string, extra?: Record<string, unknown>): never {
  console.log(JSON.stringify({ ok: false, stage, message, ...extra }));
  process.exit(1);
}

interface CookieCheck {
  present: boolean;
  httpOnly: boolean;
  secure: boolean;
  sameSite: string | null;
}

function parseSetCookies(headers: Headers): { jar: string; checks: CookieCheck[] } {
  const raw = headers.getSetCookie();
  const pairs: string[] = [];
  const checks: CookieCheck[] = [];
  for (const entry of raw) {
    const [pair, ...attrs] = entry.split(";").map((s) => s.trim());
    if (pair) pairs.push(pair);
    const name = pair?.split("=")[0] ?? "";
    const lower = attrs.map((a) => a.toLowerCase());
    checks.push({
      present: true,
      httpOnly: lower.includes("httponly"),
      secure: lower.includes("secure"),
      sameSite:
        lower.find((a) => a.startsWith("samesite="))?.split("=")[1]?.toLowerCase() ?? null,
      name,
    } as CookieCheck & { name: string });
  }
  return { jar: pairs.join("; "), checks: checks.length > 0 ? checks : [{ present: false, httpOnly: false, secure: false, sameSite: null }] };
}

/** Prefer the real session-token cookie over auxiliary cookies. */
function pickSessionCookie(checks: CookieCheck[]): CookieCheck | undefined {
  const withName = checks as (CookieCheck & { name?: string })[];
  return (
    withName.find((c) => c.present && (c.name ?? "").toLowerCase().includes("session_token")) ??
    withName.find((c) => c.present)
  );
}

// Every fetch carries a hard timeout: a hung request must fail into
// cleanup, never hang the run into claiming anything.
async function timedFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
}

async function main(): Promise<void> {
  loadLocalEnv();

  if (process.env["STAGING_AUTH_TEST"] !== "1") {
    fail("guard-flag", "Refusing: set STAGING_AUTH_TEST=1 to run this staging test.");
  }
  if (process.env["NODE_ENV"] === "production") {
    fail("guard-env", "Refusing: NODE_ENV is production.");
  }
  const secret = process.env["BETTER_AUTH_SECRET"] ?? "";
  if (secret.length < 32 || secret === DEV_SECRET_PLACEHOLDER) {
    fail(
      "guard-secret",
      "Refusing: BETTER_AUTH_SECRET must be a real generated value (32+ chars), not the dev placeholder.",
    );
  }
  const dbUrl = process.env["DATABASE_URL"] ?? "";
  if (!dbUrl) fail("guard-env", "Refusing: DATABASE_URL is not set.");

  let hostOk = false;
  try {
    hostOk = new URL(dbUrl).hostname.endsWith(process.env["STAGING_HOST_SUFFIX"] ?? "neon.tech");
  } catch {
    hostOk = false;
  }
  const base = process.env["STAGING_BASE_URL"] ?? "http://localhost:3000";
  const baseIsHttps = base.startsWith("https://");
  let healthOk = false;
  try {
    const h = await fetch(`${base}/api/health`);
    healthOk = h.ok;
  } catch {
    healthOk = false;
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
  const nameOk = dbName === (process.env["STAGING_EXPECTED_DB"] ?? "emergency");
  console.log(JSON.stringify({ stage: "guard-target", hostOk, nameOk, healthOk }));
  if (!hostOk || !nameOk || !healthOk) {
    await db.$disconnect();
    fail("guard-target", "Refusing: target server or database is not the intended staging setup.");
  }

  let userId: string | null = null;
  let incidentId: string | null = null;
  let step = "sign-up";
  const json = {
    "Content-Type": "application/json",
    // Behave like a browser: Better Auth force-validates Origin on email
    // endpoints, and Node fetch sends none by default. Same-origin value
    // only; no behavior change on the server side.
    Origin: new URL(base).origin,
    Referer: `${base}/`,
  };

  // Auditable trail: identifiers are printed the moment they exist, so even
  // a kill -9 leaves enough to construct the manual cleanup below.
  function trail(extra: Record<string, unknown>): void {
    console.log(JSON.stringify({ stage: step, ...extra }));
  }

  // Best-effort interrupt handling: try scoped cleanup on SIGINT/SIGTERM.
  // A SIGKILL cannot be caught; the trail above covers that case.
  let cleaning = false;
  async function onSignal(name: string): Promise<void> {
    if (cleaning) return;
    cleaning = true;
    await cleanup(`interrupted (${name})`);
  }
  process.on("SIGINT", () => void onSignal("SIGINT"));
  process.on("SIGTERM", () => void onSignal("SIGTERM"));

  async function cleanup(reason: string): Promise<never> {
    const safeReason = redact(reason);
    try {
      if (userId) {
        await db.session.deleteMany({ where: { userId } });
        await db.account.deleteMany({ where: { userId } });
      }
      if (incidentId) {
        // Audit rows reference the incident by objectId (not the actor, which
        // nulls on user delete) — remove them before the incident itself.
        await db.auditLog.deleteMany({ where: { objectId: incidentId } });
        await db.$transaction([
          db.triageResult.deleteMany({ where: { incidentId } }),
          db.statusEvent.deleteMany({ where: { incidentId } }),
          db.idempotencyKey.deleteMany({ where: { incidentId } }),
          db.incident.delete({ where: { id: incidentId } }),
        ]);
      }
      if (userId) {
        await db.user.delete({ where: { id: userId } });
      }
      const remaining = userId
        ? ((await db.user.count({ where: { id: userId } })) +
          (await db.session.count({ where: { userId } })) +
          (await db.account.count({ where: { userId } })))
        : 0;
      const incidentLeft = incidentId
        ? await db.incident.count({ where: { id: incidentId } })
        : 0;
      if (remaining !== 0 || incidentLeft !== 0) {
        throw new Error(`cleanup incomplete (identity rows: ${remaining}, incident rows: ${incidentLeft})`);
      }
      console.log(JSON.stringify({ ok: false, stage: step, reason: safeReason, cleanup: "removed" }));
    } catch (cleanupError) {
      console.log(
        JSON.stringify({
          ok: false,
          stage: step,
          reason: safeReason,
          cleanup: "manual-required",
          cleanupDetail:
            cleanupError instanceof Error ? redact(cleanupError.message) : "cleanup failed",
          // Narrowly scoped recovery: this fictional test identity only.
          verifySql: [
            `-- Expect all zeros for the run identity below:`,
            `-- SELECT COUNT(*) FROM "User" WHERE email = '${EMAIL}';`,
            `-- SELECT COUNT(*) FROM "Session" WHERE "userId" = '${userId ?? "?"}';`,
            `-- SELECT COUNT(*) FROM "Account" WHERE "userId" = '${userId ?? "?"}';`,
            `-- SELECT COUNT(*) FROM "Verification" WHERE identifier LIKE '%${EMAIL}%';`,
            `-- SELECT COUNT(*) FROM "AuditLog" WHERE "actorId" = '${userId ?? "?"}';`,
            `-- SELECT COUNT(*) FROM "AuditLog" WHERE "objectId" = '${incidentId ?? "?"}';`,
            `-- SELECT COUNT(*) FROM "Incident" WHERE id = '${incidentId ?? "?"}';`,
            `-- Approved deletes (replace ? only after verifying the email above):`,
            `-- DELETE FROM "Session" WHERE "userId" = '${userId ?? "?"}';`,
            `-- DELETE FROM "Account" WHERE "userId" = '${userId ?? "?"}';`,
            `-- DELETE FROM "Verification" WHERE identifier LIKE '%${EMAIL}%';`,
            `-- DELETE FROM "AuditLog" WHERE "objectId" = '${incidentId ?? "?"}';`,
            `-- DELETE FROM "TriageResult" WHERE "incidentId" = '${incidentId ?? "?"}';`,
            `-- DELETE FROM "StatusEvent" WHERE "incidentId" = '${incidentId}';`,
            `-- DELETE FROM "IdempotencyKey" WHERE "incidentId" = '${incidentId ?? "?"}';`,
            `-- DELETE FROM "Incident" WHERE id = '${incidentId ?? "?"}';`,
            `-- DELETE FROM "User" WHERE email = '${EMAIL}';`,
            `-- (AuditLog rows referencing the actor by id, if any appeared, delete explicitly by id only.)`,
          ],
        }),
      );
    }
    await db.$disconnect();
    process.exit(1);
  }

  try {
    // --- Step 1: sign-up creates exactly one test user + session cookie. ---
    // This doubles as the same-database proof: the user is created through
    // the app server, then counted through the direct connection. A server
    // pointed at any other database yields a count of 0 and aborts here —
    // in that case the stray row lives in the OTHER database (reported by
    // email only) and nothing is deleted anywhere automatically.
    const signup = await timedFetch(`${base}/api/auth/sign-up/email`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ name: "Roundtrip Auth", email: EMAIL, password: PASSWORD }),
    });
    if (!signup.ok) throw new Error(`sign-up failed (HTTP ${signup.status})`);
    const { checks: signupCookies } = parseSetCookies(signup.headers);
    const sessionCookie = pickSessionCookie(signupCookies);
    if (!sessionCookie?.httpOnly) throw new Error("sign-up issued no HttpOnly session cookie");
    if (sessionCookie.sameSite !== "lax") {
      throw new Error(`unexpected SameSite on session cookie: ${sessionCookie.sameSite ?? "absent"}`);
    }
    const secureOk = baseIsHttps ? sessionCookie.secure : !sessionCookie.secure;
    if (!secureOk) throw new Error("session cookie Secure flag does not match the base URL scheme");
    const usersFound = await db.user.count({ where: { email: EMAIL } });
    if (usersFound !== 1) {
      throw new Error(
        `same-database proof failed: expected exactly 1 test user via direct connection, found ${usersFound}. ` +
          `The app server is NOT writing to the verified staging database; stopping with no deletes. ` +
          `A stray test user may exist in the server's database under the run email.`,
      );
    }
    userId = (await db.user.findUniqueOrThrow({ where: { email: EMAIL } })).id;
    trail({ created: "user", email: EMAIL, userId });

    // --- Step 2: sign-in with the same credentials issues a fresh cookie. ---
    step = "sign-in";
    const signin = await timedFetch(`${base}/api/auth/sign-in/email`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    if (!signin.ok) throw new Error(`sign-in failed (HTTP ${signin.status})`);
    const { jar: signinJar, checks: signinCookies } = parseSetCookies(signin.headers);
    if (!pickSessionCookie(signinCookies)?.httpOnly) {
      throw new Error("sign-in issued no HttpOnly session cookie");
    }

    // --- Step 3: session endpoint identifies the expected test user. ---
    step = "get-session";
    const who = await timedFetch(`${base}/api/auth/get-session`, {
      headers: { cookie: signinJar },
    });
    if (!who.ok) throw new Error(`get-session failed (HTTP ${who.status})`);
    const session = (await who.json()) as { user?: { id: string; email: string } };
    if (session.user?.id !== userId || session.user?.email !== EMAIL) {
      throw new Error("session identity mismatch");
    }

    // --- Step 4: RBAC proof — BYSTANDER is denied the staff list (403). ---
    step = "rbac-deny";
    const denied = await timedFetch(`${base}/api/incidents`, { headers: { cookie: signinJar } });
    if (denied.status !== 403) throw new Error(`expected 403 on staff list, got ${denied.status}`);

    // --- Step 5: owner-scoped incident create + read as the test user. ---
    step = "owner-scope";
    const created = await timedFetch(`${base}/api/incidents`, {
      method: "POST",
      headers: { ...json, cookie: signinJar },
      body: JSON.stringify({
        affectsSelf: true,
        emergencyType: "[ROUNDTRIP-AUTH] fictional scope check",
        triage: [],
        idempotencyKey: IDEMPOTENCY_KEY,
      }),
    });
    if (created.status !== 201) throw new Error(`owner create failed (HTTP ${created.status})`);
    incidentId = ((await created.json()) as { incident: { id: string } }).incident.id;
    trail({ created: "incident", incidentId });
    const readBack = await timedFetch(`${base}/api/incidents/${incidentId}`, {
      headers: { cookie: signinJar },
    });
    if (!readBack.ok) throw new Error(`owner read failed (HTTP ${readBack.status})`);

    // --- Step 5b: anonymous ambulance confirmation is rejected (401). ---
    // Placed while the incident exists: requireRoles runs before any read
    // or write, so this asserts rejection with zero database contact.
    step = "ambulance-401";
    const anonAmb = await timedFetch(`${base}/api/incidents/${incidentId}/ambulance`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ decision: "confirm", idempotencyKey: `${IDEMPOTENCY_KEY}-amb` }),
    });
    if (anonAmb.status !== 401) throw new Error(`expected 401 anonymous ambulance, got ${anonAmb.status}`);

    // --- Step 6: sign-out invalidates; session gone; access denied. ---
    step = "sign-out";
    // Empty JSON object: the endpoint requires a parseable body alongside
    // the content type; the session itself comes from the cookie.
    const out = await timedFetch(`${base}/api/auth/sign-out`, {
      method: "POST",
      headers: { ...json, cookie: signinJar },
      body: "{}",
    });
    if (!out.ok) throw new Error(`sign-out failed (HTTP ${out.status})`);
    const after = await timedFetch(`${base}/api/auth/get-session`, {
      headers: { cookie: signinJar },
    });
    const afterJson = (await after.json().catch(() => null)) as { user?: unknown } | null;
    if (afterJson?.user) throw new Error("session still valid after sign-out");
    const anonOps = await timedFetch(`${base}/api/incidents`);
    if (anonOps.status !== 401) throw new Error(`expected 401 anonymous, got ${anonOps.status}`);
    const anonRead = await timedFetch(`${base}/api/incidents/${incidentId}`);
    if (anonRead.status !== 404) throw new Error(`expected 404 anonymous owned read, got ${anonRead.status}`);

    // --- Step 7: scoped cleanup + zero verification (mirrors catch path).
    // Extra tables swept for completeness: Verification (email identifier,
    // expected 0 — sign-up sends nothing with verification disabled) and
    // AuditLog by actor (expected 0 — auth endpoints write no audit rows).
    // Anything unexpected aborts into the manual path rather than deleting
    // records the test cannot account for.
    step = "cleanup";
    const preVerification = await db.verification.count({
      where: { identifier: { contains: EMAIL } },
    });
    const preAudit = userId ? await db.auditLog.count({ where: { actorId: userId } }) : 0;
    const preAuditObject = incidentId
      ? await db.auditLog.count({ where: { objectId: incidentId } })
      : 0;
    if (preVerification !== 0 || preAudit !== 0 || preAuditObject !== 0) {
      throw new Error(
        `unexpected auxiliary rows (verification: ${preVerification}, audit-by-actor: ${preAudit}, audit-by-object: ${preAuditObject})`,
      );
    }
    if (userId) {
      await db.session.deleteMany({ where: { userId } });
      await db.account.deleteMany({ where: { userId } });
    }
    if (incidentId) {
      await db.auditLog.deleteMany({ where: { objectId: incidentId } });
      await db.$transaction([
        db.triageResult.deleteMany({ where: { incidentId } }),
        db.statusEvent.deleteMany({ where: { incidentId } }),
        db.idempotencyKey.deleteMany({ where: { incidentId } }),
        db.incident.delete({ where: { id: incidentId } }),
      ]);
    }
    if (userId) {
      await db.user.delete({ where: { id: userId } });
    }
    const leftUsers = userId ? await db.user.count({ where: { id: userId } }) : 0;
    const leftSessions = userId ? await db.session.count({ where: { userId } }) : 0;
    const leftAccounts = userId ? await db.account.count({ where: { userId } }) : 0;
    const leftIncident = incidentId ? await db.incident.count({ where: { id: incidentId } }) : 0;
    const leftAudit = incidentId ? await db.auditLog.count({ where: { objectId: incidentId } }) : 0;
    const totalLeft = leftUsers + leftSessions + leftAccounts + leftIncident + leftAudit;
    if (totalLeft !== 0) throw new Error(`cleanup verification failed (${totalLeft} row(s) remain)`);
    console.log(
      JSON.stringify({
        ok: true,
        stage: "done",
        email: EMAIL,
        cookie: {
          httpOnly: true,
          secureAsExpected: secureOk,
          sameSite: sessionCookie.sameSite,
        },
        rowsRemoved: { users: 1, incidents: 1 },
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
