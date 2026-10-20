import type { IncidentStatus } from "./status";

// Client waiting-screen phase derived ONLY from server-confirmed state.
// Availability alone never advances the client: only a dispatcher-sourced
// dispatch confirmation moves to "dispatched". A forged or user-sourced
// DISPATCHED_ACCEPTED falls back to "sent" — never trusted.
export type WaitingPhase = "sent" | "acknowledged" | "dispatched" | "unconfirmed" | "closed";

const DISPATCHED_STATES: IncidentStatus[] = ["DISPATCHED_ACCEPTED", "EN_ROUTE", "ARRIVED"];

/** True when the backend records an authorized dispatch confirmation. */
export function isDispatchConfirmed(status: IncidentStatus, lastSource: string | null): boolean {
  return DISPATCHED_STATES.includes(status) && lastSource === "dispatcher";
}

/** Consultation is reachable after dispatch, or as a fallback when no
 * ambulance is available (client still needs a professional). */
export function canConsult(
  status: IncidentStatus,
  lastSource: string | null,
  hasDeclinedDispatch: boolean,
): boolean {
  if (isDispatchConfirmed(status, lastSource)) return true;
  if (hasDeclinedDispatch && (status === "REQUEST_STARTED" || status === "REQUEST_SENT" || status === "ACKNOWLEDGED")) {
    return true;
  }
  return false;
}

export function waitingPhaseFor(status: IncidentStatus, lastSource: string | null): WaitingPhase {
  if (status === "CANCELLED" || status === "COMPLETED_HANDED_OVER") return "closed";
  if (status === "UNABLE_TO_CONFIRM") return "unconfirmed";
  if (isDispatchConfirmed(status, lastSource)) return "dispatched";
  if (status === "ACKNOWLEDGED") return "acknowledged";
  return "sent";
}

export const WAITING_COPY: Record<WaitingPhase, { headline: string; status: string }> = {
  sent: {
    headline: "HELP IS ON THE WAY",
    status: "Emergency alert sent — dispatch is verifying availability.",
  },
  acknowledged: {
    headline: "HELP IS ON THE WAY",
    status: "Ambulance availability confirmed — dispatch is being arranged.",
  },
  dispatched: {
    headline: "HELP IS ON THE WAY",
    status: "Ambulance is on the way.",
  },
  unconfirmed: {
    headline: "STAY ON THIS SCREEN",
    status: "We could not confirm your request. Keep this screen open and try again — or call your local emergency number directly.",
  },
  closed: {
    headline: "REQUEST CLOSED",
    status: "This emergency request has ended. Start a new report if you still need help.",
  },
};

export const DECLINED_COPY =
  "No ambulance available right now. You can still connect with a medical professional below.";
