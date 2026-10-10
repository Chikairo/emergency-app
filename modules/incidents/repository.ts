import type { IncidentStatus } from "./status";
import type { LocationInput, ReportIncidentInput } from "./validation";

// Storage port for incidents. Prisma backs production; the in-memory
// adapter backs local development without Docker. Both obey the same
// transition rules in `./status`.

export interface StatusEventRecord {
  id: string;
  from: IncidentStatus | null;
  to: IncidentStatus;
  actor: string | null;
  source: string;
  note?: string;
  at: Date;
}

export interface IncidentRecord {
  id: string;
  reporter: string | null;
  emergencyType: string;
  affectsSelf: boolean;
  triage: { question: string; answer: string }[];
  status: IncidentStatus;
  location: LocationInput | null;
  regionCode: string;
  events: StatusEventRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AppendStatusOptions {
  actor?: string | null;
  source: string;
  note?: string;
  idempotencyKey: string;
}

export interface IncidentStore {
  createIncident(input: ReportIncidentInput, opts: { reporter?: string | null }): IncidentRecord;
  getIncident(id: string): IncidentRecord | null;
  listIncidents(): IncidentRecord[];
  updateLocation(id: string, location: LocationInput): IncidentRecord;
  appendStatus(id: string, to: IncidentStatus, opts: AppendStatusOptions): IncidentRecord;
}

export function notFoundError(id: string): Error {
  return new Error(`Incident not found: ${id}`);
}
