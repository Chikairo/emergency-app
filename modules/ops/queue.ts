import type { IncidentStatus } from "@/modules/incidents/status";

// Dispatcher queue helpers (pure, no I/O). Sections keep availability
// distinct from dispatch: ACKNOWLEDGED waits in "awaiting", only
// dispatch-family states count as dispatched. UNABLE_TO_CONFIRM stays in
// "incoming" because it needs operator attention, not closure.
export type OpsSection = "incoming" | "awaiting" | "dispatched" | "closed";

export function sectionFor(status: IncidentStatus): OpsSection {
  if (status === "REQUEST_STARTED" || status === "REQUEST_SENT" || status === "UNABLE_TO_CONFIRM") {
    return "incoming";
  }
  if (status === "ACKNOWLEDGED") return "awaiting";
  if (status === "DISPATCHED_ACCEPTED" || status === "EN_ROUTE" || status === "ARRIVED") {
    return "dispatched";
  }
  return "closed";
}

/** IDs present in `current` but absent from `known`. Callers add results
 * to their known set, so each incident alerts exactly once. */
export function detectNewIds(
  known: readonly string[],
  current: readonly { id: string }[],
): string[] {
  const seen = new Set(known);
  const fresh: string[] = [];
  for (const record of current) {
    if (!seen.has(record.id)) {
      seen.add(record.id);
      fresh.push(record.id);
    }
  }
  return fresh;
}

/** Drop an incident from the unopened-alert set when the dispatcher
 * opens it. The incident itself is untouched. */
export function markSeen(alerts: readonly string[], id: string): string[] {
  return alerts.filter((a) => a !== id);
}
