import { randomUUID } from "node:crypto";
import { assertTransition } from "./status";
import type { IncidentStatus } from "./status";
import { locationSchema, reportIncidentSchema } from "./validation";
import type {
  AppendStatusOptions,
  IncidentRecord,
  IncidentStore,
} from "./repository";
import { notFoundError } from "./repository";

/**
 * In-memory IncidentStore for Docker-free local development and tests.
 * Same rules as the Prisma adapter: validated inputs, legal transitions
 * only, idempotent creates and status appends.
 */
export class MemoryIncidentStore implements IncidentStore {
  private incidents = new Map<string, IncidentRecord>();
  private createKeys = new Map<string, string>();
  private eventKeys = new Set<string>();

  createIncident(
    raw: unknown,
    opts: { reporter?: string | null } = {},
  ): IncidentRecord {
    const input = reportIncidentSchema.parse(raw);
    const seen = this.createKeys.get(input.idempotencyKey);
    if (seen) {
      const existing = this.incidents.get(seen);
      if (existing) return existing;
    }
    const now = new Date();
    const record: IncidentRecord = {
      id: randomUUID(),
      reporter: opts.reporter ?? null,
      emergencyType: input.emergencyType,
      affectsSelf: input.affectsSelf,
      triage: input.triage,
      status: "REQUEST_STARTED",
      location: null,
      regionCode: "pilot-mock",
      events: [
        {
          id: randomUUID(),
          from: null,
          to: "REQUEST_STARTED",
          actor: opts.reporter ?? null,
          source: "user",
          at: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    this.incidents.set(record.id, record);
    this.createKeys.set(input.idempotencyKey, record.id);
    return record;
  }

  getIncident(id: string): IncidentRecord | null {
    return this.incidents.get(id) ?? null;
  }

  updateLocation(id: string, raw: unknown): IncidentRecord {
    const record = this.incidents.get(id);
    if (!record) throw notFoundError(id);
    const location = locationSchema.parse(raw);
    record.location = location;
    record.updatedAt = new Date();
    return record;
  }

  appendStatus(id: string, to: IncidentStatus, opts: AppendStatusOptions): IncidentRecord {
    const record = this.incidents.get(id);
    if (!record) throw notFoundError(id);
    const key = `${id}:${opts.idempotencyKey}`;
    if (this.eventKeys.has(key)) return record;
    assertTransition(record.status, to);
    const event = {
      id: randomUUID(),
      from: record.status,
      to,
      actor: opts.actor ?? null,
      source: opts.source,
      note: opts.note,
      at: new Date(),
    };
    record.events.push(event);
    record.status = to;
    record.updatedAt = event.at;
    this.eventKeys.add(key);
    return record;
  }

  /** Test/dev helper: number of stored incidents. */
  get size(): number {
    return this.incidents.size;
  }
}
