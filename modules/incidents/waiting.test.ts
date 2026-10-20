import { describe, expect, it } from "vitest";
import {
  DECLINED_COPY,
  WAITING_COPY,
  canConsult,
  isDispatchConfirmed,
  waitingPhaseFor,
} from "./waiting";

describe("waiting screen phase (server-confirmed only)", () => {
  it("starts in sent phase after creation", () => {
    expect(waitingPhaseFor("REQUEST_STARTED", "user")).toBe("sent");
    expect(waitingPhaseFor("REQUEST_SENT", "user")).toBe("sent");
  });

  it("does not advance on availability alone", () => {
    expect(waitingPhaseFor("ACKNOWLEDGED", "dispatcher")).toBe("acknowledged");
    expect(isDispatchConfirmed("ACKNOWLEDGED", "dispatcher")).toBe(false);
    expect(canConsult("ACKNOWLEDGED", "dispatcher", false)).toBe(false);
  });

  it("advances only on dispatcher-sourced dispatch confirmation", () => {
    expect(waitingPhaseFor("DISPATCHED_ACCEPTED", "dispatcher")).toBe("dispatched");
    expect(isDispatchConfirmed("DISPATCHED_ACCEPTED", "dispatcher")).toBe(true);
    expect(canConsult("DISPATCHED_ACCEPTED", "dispatcher", false)).toBe(true);
    expect(waitingPhaseFor("EN_ROUTE", "dispatcher")).toBe("dispatched");
  });

  it("never trusts user-sourced dispatch status", () => {
    expect(waitingPhaseFor("DISPATCHED_ACCEPTED", "user")).toBe("sent");
    expect(isDispatchConfirmed("DISPATCHED_ACCEPTED", "user")).toBe(false);
    expect(canConsult("DISPATCHED_ACCEPTED", "user", false)).toBe(false);
  });

  it("keeps consultation available when ambulances decline", () => {
    expect(canConsult("REQUEST_SENT", "user", true)).toBe(true);
    expect(canConsult("ACKNOWLEDGED", "dispatcher", true)).toBe(true);
    expect(canConsult("REQUEST_SENT", "user", false)).toBe(false);
    expect(DECLINED_COPY).toMatch(/no ambulance available/i);
  });

  it("handles terminal states honestly", () => {
    expect(waitingPhaseFor("CANCELLED", "user")).toBe("closed");
    expect(waitingPhaseFor("COMPLETED_HANDED_OVER", "dispatcher")).toBe("closed");
    expect(waitingPhaseFor("UNABLE_TO_CONFIRM", "system")).toBe("unconfirmed");
    expect(canConsult("CANCELLED", "user", false)).toBe(false);
  });

  it("keeps honest copy for every phase", () => {
    expect(WAITING_COPY.sent.status).toMatch(/verifying availability/i);
    expect(WAITING_COPY.acknowledged.status).toMatch(/being arranged/i);
    expect(WAITING_COPY.dispatched.status).toBe("Ambulance is on the way.");
  });
});
