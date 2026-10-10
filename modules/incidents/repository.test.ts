import { describe, expect, it } from "vitest";
import { MemoryIncidentStore } from "./memory-store";
import { InvalidTransitionError } from "./status";

const report = {
  affectsSelf: false,
  emergencyType: "Road traffic collision",
  idempotencyKey: "report-key-abcdef",
};

const landmark = {
  latitude: null,
  longitude: null,
  addressText: null,
  landmark: "Blue kiosk opposite the market",
  locationState: "approximate" as const,
};

describe("MemoryIncidentStore (Docker-free dev adapter)", () => {
  it("creates an incident in REQUEST_STARTED with a creation event", () => {
    const store = new MemoryIncidentStore();
    const rec = store.createIncident(report);
    expect(rec.status).toBe("REQUEST_STARTED");
    expect(rec.events).toHaveLength(1);
    expect(rec.events[0]?.to).toBe("REQUEST_STARTED");
    expect(store.getIncident(rec.id)?.id).toBe(rec.id);
  });

  it("is idempotent on create with the same key", () => {
    const store = new MemoryIncidentStore();
    const a = store.createIncident(report);
    const b = store.createIncident({ ...report, emergencyType: "Changed" });
    expect(b.id).toBe(a.id);
    expect(store.size).toBe(1);
  });

  it("stores a landmark-only location without inventing coordinates", () => {
    const store = new MemoryIncidentStore();
    const rec = store.createIncident(report);
    const updated = store.updateLocation(rec.id, landmark);
    expect(updated.location?.locationState).toBe("approximate");
    expect(updated.location?.latitude).toBeNull();
  });

  it("appends legal transitions and rejects illegal ones", () => {
    const store = new MemoryIncidentStore();
    const rec = store.createIncident(report);
    const sent = store.appendStatus(rec.id, "REQUEST_SENT", {
      source: "system",
      idempotencyKey: "ev-1-abcdef",
    });
    expect(sent.status).toBe("REQUEST_SENT");
    expect(sent.events).toHaveLength(2);
    expect(() =>
      store.appendStatus(rec.id, "DISPATCHED_ACCEPTED", {
        source: "system",
        idempotencyKey: "ev-2-abcdef",
      }),
    ).toThrow(InvalidTransitionError);
    // Failed append leaves state untouched.
    expect(store.getIncident(rec.id)?.status).toBe("REQUEST_SENT");
  });

  it("is idempotent on status append with the same key", () => {
    const store = new MemoryIncidentStore();
    const rec = store.createIncident(report);
    store.appendStatus(rec.id, "REQUEST_SENT", { source: "system", idempotencyKey: "ev-dup-1234" });
    const again = store.appendStatus(rec.id, "REQUEST_SENT", {
      source: "system",
      idempotencyKey: "ev-dup-1234",
    });
    expect(again.events).toHaveLength(2);
  });

  it("throws for unknown incidents", () => {
    const store = new MemoryIncidentStore();
    expect(store.getIncident("missing")).toBeNull();
    expect(() =>
      store.appendStatus("missing", "REQUEST_SENT", { source: "system", idempotencyKey: "k-12345678" }),
    ).toThrow(/not found/);
  });
});
