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
  it("creates an incident in REQUEST_STARTED with a creation event", async () => {
    const store = new MemoryIncidentStore();
    const rec = await store.createIncident(report);
    expect(rec.status).toBe("REQUEST_STARTED");
    expect(rec.events).toHaveLength(1);
    expect(rec.events[0]?.to).toBe("REQUEST_STARTED");
    expect((await store.getIncident(rec.id))?.id).toBe(rec.id);
  });

  it("is idempotent on create with the same key", async () => {
    const store = new MemoryIncidentStore();
    const a = await store.createIncident(report);
    const b = await store.createIncident({ ...report, emergencyType: "Changed" });
    expect(b.id).toBe(a.id);
    expect(store.size).toBe(1);
  });

  it("stores a landmark-only location without inventing coordinates", async () => {
    const store = new MemoryIncidentStore();
    const rec = await store.createIncident(report);
    const updated = await store.updateLocation(rec.id, landmark);
    expect(updated.location?.locationState).toBe("approximate");
    expect(updated.location?.latitude).toBeNull();
  });

  it("appends legal transitions and rejects illegal ones", async () => {
    const store = new MemoryIncidentStore();
    const rec = await store.createIncident(report);
    const sent = await store.appendStatus(rec.id, "REQUEST_SENT", {
      source: "system",
      idempotencyKey: "ev-1-abcdef",
    });
    expect(sent.status).toBe("REQUEST_SENT");
    expect(sent.events).toHaveLength(2);
    await expect(
      store.appendStatus(rec.id, "DISPATCHED_ACCEPTED", {
        source: "system",
        idempotencyKey: "ev-2-abcdef",
      }),
    ).rejects.toThrow(InvalidTransitionError);
    // Failed append leaves state untouched.
    expect((await store.getIncident(rec.id))?.status).toBe("REQUEST_SENT");
  });

  it("is idempotent on status append with the same key", async () => {
    const store = new MemoryIncidentStore();
    const rec = await store.createIncident(report);
    await store.appendStatus(rec.id, "REQUEST_SENT", { source: "system", idempotencyKey: "ev-dup-1234" });
    const again = await store.appendStatus(rec.id, "REQUEST_SENT", {
      source: "system",
      idempotencyKey: "ev-dup-1234",
    });
    expect(again.events).toHaveLength(2);
  });

  it("throws for unknown incidents", async () => {
    const store = new MemoryIncidentStore();
    expect(await store.getIncident("missing")).toBeNull();
    await expect(
      store.appendStatus("missing", "REQUEST_SENT", { source: "system", idempotencyKey: "k-12345678" }),
    ).rejects.toThrow(/not found/);
  });
});
