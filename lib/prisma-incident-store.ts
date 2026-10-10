import type { Prisma, PrismaClient } from "@prisma/client";
import { assertTransition } from "@/modules/incidents/status";
import type { IncidentStatus } from "@/modules/incidents/status";
import type {
  AppendStatusOptions,
  IncidentRecord,
  IncidentStore,
} from "@/modules/incidents/repository";
import { notFoundError } from "@/modules/incidents/repository";
import { classifyUrgency } from "@/modules/triage/flow";
import { submitTriageSchema } from "@/modules/triage/validation";
import { locationSchema, reportIncidentSchema } from "@/modules/incidents/validation";
import type { LocationInput, ReportIncidentInput } from "@/modules/incidents/validation";

type Db = PrismaClient;
type FullIncident = Prisma.IncidentGetPayload<{
  include: { events: true; triage: true; triageResults: true };
}>;

function toLocation(row: {
  latitude: number | null;
  longitude: number | null;
  addressText: string | null;
  landmark: string | null;
  locationState: string;
}): LocationInput | null {
  if (
    row.locationState === "pending" &&
    row.latitude === null &&
    row.longitude === null &&
    !row.addressText &&
    !row.landmark
  ) {
    return null;
  }
  return {
    latitude: row.latitude,
    longitude: row.longitude,
    addressText: row.addressText,
    landmark: row.landmark,
    locationState: row.locationState as LocationInput["locationState"],
  };
}

function toRecord(row: FullIncident): IncidentRecord {
  return {
    id: row.id,
    reporter: row.reporterId,
    emergencyType: row.emergencyType,
    affectsSelf: row.affectsSelf,
    triage: row.triage.map((t) => ({ question: t.question, answer: t.answer })),
    triageResults: row.triageResults.map((t) => ({
      questionId: t.questionId,
      answer: t.answer,
      note: t.note ?? undefined,
      source: t.source,
      at: t.createdAt,
    })),
    urgency: row.urgency,
    urgencyBasis: row.urgencyBasis,
    rulesetVersion: row.rulesetVersion,
    status: row.status as IncidentStatus,
    location: toLocation(row),
    regionCode: row.regionCode,
    events: row.events.map((e) => ({
      id: e.id,
      from: (e.from ?? null) as IncidentStatus | null,
      to: e.to as IncidentStatus,
      actor: e.actorId,
      source: e.source,
      note: e.note ?? undefined,
      at: e.createdAt,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const fullInclude = {
  events: { orderBy: { createdAt: "asc" as const } },
  triage: true,
  triageResults: { orderBy: { createdAt: "asc" as const } },
};

/** Persist geography when coordinates exist; warn (never crash) without PostGIS. */
async function writeGeography(
  db: Db,
  table: "Incident" | "Facility",
  id: string,
  latitude: number | null,
  longitude: number | null,
): Promise<void> {
  if (latitude === null || longitude === null) return;
  try {
    if (table === "Incident") {
      await db.$executeRaw`UPDATE "Incident" SET location = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326) WHERE id = ${id}`;
    }
  } catch {
    console.warn(
      "[prisma-store] PostGIS unavailable; coordinates stored as floats only. " +
        "Run: CREATE EXTENSION IF NOT EXISTS postgis;",
    );
  }
}

async function claimKey(db: Db, key: string, incidentId: string): Promise<boolean> {
  try {
    await db.idempotencyKey.create({ data: { key, incidentId } });
    return true;
  } catch {
    return false; // key seen before: caller must replay without side effects
  }
}

/** Prisma-backed IncidentStore. Same rules as memory; durable across instances. */
export class PrismaIncidentStore implements IncidentStore {
  constructor(private readonly db: Db) {}

  async createIncident(
    raw: unknown,
    opts: { reporter?: string | null } = {},
  ): Promise<IncidentRecord> {
    const input: ReportIncidentInput = reportIncidentSchema.parse(raw);
    const key = `incident:${input.idempotencyKey}`;
    const existing = await this.db.idempotencyKey.findUnique({ where: { key } });
    if (existing) {
      const row = await this.db.incident.findUnique({
        where: { id: existing.incidentId },
        include: fullInclude,
      });
      if (row) return toRecord(row);
    }
    const row = await this.db.incident.create({
      data: {
        reporterId: opts.reporter ?? null,
        emergencyType: input.emergencyType,
        affectsSelf: input.affectsSelf,
        regionCode: "pilot-mock",
        triage: { create: input.triage.map((t) => ({ question: t.question, answer: t.answer })) },
        events: {
          create: [{ from: null, to: "REQUEST_STARTED", actorId: opts.reporter ?? null, source: "user" }],
        },
      },
      include: fullInclude,
    });
    await this.db.idempotencyKey.create({ data: { key, incidentId: row.id } }).catch(() => {});
    return toRecord(row);
  }

  async getIncident(id: string): Promise<IncidentRecord | null> {
    const row = await this.db.incident.findUnique({ where: { id }, include: fullInclude });
    return row ? toRecord(row) : null;
  }

  async listIncidents(): Promise<IncidentRecord[]> {
    const rows = await this.db.incident.findMany({
      orderBy: { createdAt: "desc" },
      include: fullInclude,
    });
    return rows.map(toRecord);
  }

  async updateLocation(id: string, raw: unknown): Promise<IncidentRecord> {
    const location: LocationInput = locationSchema.parse(raw);
    const row = await this.db.incident.findUnique({ where: { id } });
    if (!row) throw notFoundError(id);
    const updated = await this.db.incident.update({
      where: { id },
      data: {
        latitude: location.latitude,
        longitude: location.longitude,
        addressText: location.addressText,
        landmark: location.landmark,
        locationState: location.locationState,
      },
      include: fullInclude,
    });
    await writeGeography(this.db, "Incident", id, location.latitude, location.longitude);
    return toRecord(updated);
  }

  async appendStatus(
    id: string,
    to: IncidentStatus,
    opts: AppendStatusOptions,
  ): Promise<IncidentRecord> {
    const row = await this.db.incident.findUnique({ where: { id }, include: fullInclude });
    if (!row) throw notFoundError(id);
    const key = `${id}:status:${opts.idempotencyKey}`;
    if (!(await claimKey(this.db, key, id))) {
      const current = await this.db.incident.findUnique({ where: { id }, include: fullInclude });
      if (!current) throw notFoundError(id);
      return toRecord(current);
    }
    assertTransition(row.status as IncidentStatus, to);
    const terminal = to === "COMPLETED_HANDED_OVER" || to === "CANCELLED";
    const updated = await this.db.incident.update({
      where: { id },
      data: {
        status: to,
        ...(terminal ? { closedAt: new Date(), closeReason: opts.note ?? null } : {}),
        events: {
          create: [{ from: row.status, to, actorId: opts.actor ?? null, source: opts.source, note: opts.note ?? null }],
        },
      },
      include: fullInclude,
    });
    return toRecord(updated);
  }

  async submitTriage(
    id: string,
    raw: unknown,
    opts: { source: string },
  ): Promise<{ incident: IncidentRecord; urgency: string; basis: string[] }> {
    const row = await this.db.incident.findUnique({
      where: { id },
      include: { triageResults: true },
    });
    if (!row) throw notFoundError(id);
    const input = submitTriageSchema.parse(raw);
    const key = `${id}:triage:${input.idempotencyKey}`;
    if (!(await claimKey(this.db, key, id))) {
      const current = await this.db.incident.findUnique({ where: { id }, include: fullInclude });
      if (!current) throw notFoundError(id);
      return { incident: toRecord(current), urgency: current.urgency ?? "UNKNOWN", basis: current.urgencyBasis };
    }
    await this.db.triageResult.createMany({
      data: input.answers.map((a) => ({
        incidentId: id,
        questionId: a.questionId,
        answer: a.answer,
        note: a.note ?? null,
        source: opts.source,
      })),
    });
    const merged: Record<string, string> = {};
    for (const t of row.triageResults) merged[t.questionId] = t.answer;
    for (const a of input.answers) merged[a.questionId] = a.answer;
    const classified = classifyUrgency(
      merged as Partial<Record<string, "yes" | "no" | "unsure" | "skipped">>,
    );
    const updated = await this.db.incident.update({
      where: { id },
      data: {
        urgency: classified.urgency,
        urgencyBasis: classified.basis,
        rulesetVersion: classified.rulesetVersion,
      },
      include: fullInclude,
    });
    return { incident: toRecord(updated), urgency: classified.urgency, basis: classified.basis };
  }
}
