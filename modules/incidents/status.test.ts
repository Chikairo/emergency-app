import { describe, expect, it } from "vitest";
import {
  InvalidTransitionError,
  assertTransition,
  isValidTransition,
} from "./status";
import {
  locationSchema,
  reportIncidentSchema,
  statusUpdateSchema,
} from "./validation";

describe("incident status machine (PRD §9)", () => {
  it("walks the happy path start -> handed over", () => {
    const path = [
      [null, "REQUEST_STARTED"],
      ["REQUEST_STARTED", "REQUEST_SENT"],
      ["REQUEST_SENT", "ACKNOWLEDGED"],
      ["ACKNOWLEDGED", "DISPATCHED_ACCEPTED"],
      ["DISPATCHED_ACCEPTED", "EN_ROUTE"],
      ["EN_ROUTE", "ARRIVED"],
      ["ARRIVED", "COMPLETED_HANDED_OVER"],
    ] as const;
    for (const [from, to] of path) {
      expect(isValidTransition(from, to)).toBe(true);
      expect(() => assertTransition(from, to)).not.toThrow();
    }
  });

  it("rejects sent -> dispatched without acknowledgement (no false dispatch)", () => {
    expect(isValidTransition("REQUEST_SENT", "DISPATCHED_ACCEPTED")).toBe(false);
    expect(() => assertTransition("REQUEST_SENT", "DISPATCHED_ACCEPTED")).toThrow(
      InvalidTransitionError,
    );
  });

  it("rejects skipping en-route / arrival steps", () => {
    expect(isValidTransition("DISPATCHED_ACCEPTED", "ARRIVED")).toBe(false);
    expect(isValidTransition("EN_ROUTE", "COMPLETED_HANDED_OVER")).toBe(false);
  });

  it("allows retry after unable-to-confirm, and cancel from active states", () => {
    expect(isValidTransition("UNABLE_TO_CONFIRM", "REQUEST_SENT")).toBe(true);
    for (const s of ["REQUEST_STARTED", "REQUEST_SENT", "ACKNOWLEDGED", "EN_ROUTE"] as const) {
      expect(isValidTransition(s, "CANCELLED")).toBe(true);
    }
  });

  it("treats completed and cancelled as terminal", () => {
    for (const terminal of ["COMPLETED_HANDED_OVER", "CANCELLED"] as const) {
      for (const s of ["REQUEST_SENT", "ARRIVED", "CANCELLED", "COMPLETED_HANDED_OVER"] as const) {
        expect(isValidTransition(terminal, s)).toBe(false);
      }
    }
  });
});

describe("reporting validation", () => {
  it("accepts a minimal urgent report (triage skippable)", () => {
    const parsed = reportIncidentSchema.safeParse({
      affectsSelf: true,
      emergencyType: "Severe bleeding",
      idempotencyKey: "urgent-key-12345",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty emergency type and short idempotency keys", () => {
    expect(
      reportIncidentSchema.safeParse({
        affectsSelf: false,
        emergencyType: "",
        idempotencyKey: "short",
      }).success,
    ).toBe(false);
  });

  it("accepts landmark-only location as approximate (no fake precision)", () => {
    const parsed = locationSchema.safeParse({
      latitude: null,
      longitude: null,
      addressText: null,
      landmark: "Blue kiosk opposite the market",
      locationState: "approximate",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects out-of-range coordinates", () => {
    expect(
      locationSchema.safeParse({
        latitude: 95,
        longitude: 0,
        addressText: null,
        landmark: null,
        locationState: "pending",
      }).success,
    ).toBe(false);
  });

  it("rejects unknown status values", () => {
    expect(
      statusUpdateSchema.safeParse({ to: "DISPATCHED", idempotencyKey: "valid-key-12345" })
        .success,
    ).toBe(false);
  });
});
