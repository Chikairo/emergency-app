// Incident status state machine (PRD §9, FR-08).
// Single source of truth for legal transitions. Server and client import this;
// the API re-validates on every write. Invalid transitions throw — they are
// never silently coerced, and a sent request is never inferred as dispatched.

export const INCIDENT_STATUSES = [
  "REQUEST_STARTED",
  "REQUEST_SENT",
  "ACKNOWLEDGED",
  "DISPATCHED_ACCEPTED",
  "EN_ROUTE",
  "ARRIVED",
  "COMPLETED_HANDED_OVER",
  "UNABLE_TO_CONFIRM",
  "CANCELLED",
] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

// from -> allowed to[] . `null` means the incident was just created.
const TRANSITIONS: Record<string, IncidentStatus[]> = {
  NONE: ["REQUEST_STARTED"],
  REQUEST_STARTED: ["REQUEST_SENT", "CANCELLED"],
  REQUEST_SENT: ["ACKNOWLEDGED", "UNABLE_TO_CONFIRM", "CANCELLED"],
  ACKNOWLEDGED: ["DISPATCHED_ACCEPTED", "UNABLE_TO_CONFIRM", "CANCELLED"],
  DISPATCHED_ACCEPTED: ["EN_ROUTE", "UNABLE_TO_CONFIRM", "CANCELLED"],
  EN_ROUTE: ["ARRIVED", "UNABLE_TO_CONFIRM", "CANCELLED"],
  ARRIVED: ["COMPLETED_HANDED_OVER", "CANCELLED"],
  UNABLE_TO_CONFIRM: ["REQUEST_SENT", "CANCELLED"],
  COMPLETED_HANDED_OVER: [],
  CANCELLED: [],
};

export function isValidTransition(
  from: IncidentStatus | null,
  to: IncidentStatus,
): boolean {
  const key = from ?? "NONE";
  return (TRANSITIONS[key] ?? []).includes(to);
}

export class InvalidTransitionError extends Error {
  readonly from: IncidentStatus | null;
  readonly to: IncidentStatus;

  constructor(from: IncidentStatus | null, to: IncidentStatus) {
    super(
      `Invalid incident transition: ${from ?? "NONE"} -> ${to}. ` +
        `A sent request must be acknowledged before it can be dispatched.`,
    );
    this.name = "InvalidTransitionError";
    this.from = from;
    this.to = to;
  }
}

/** Assert a transition is legal; throws InvalidTransitionError otherwise. */
export function assertTransition(
  from: IncidentStatus | null,
  to: IncidentStatus,
): void {
  if (!INCIDENT_STATUSES.includes(to)) {
    throw new InvalidTransitionError(from, to);
  }
  if (!isValidTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}
