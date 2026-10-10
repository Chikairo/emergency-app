import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("store selector (fail-closed)", () => {
  it("refuses volatile memory in production without DATABASE_URL", async () => {
    vi.stubEnv("NODE_ENV", "production");
    // Blank, not just deleted: database clients auto-load .env on import.
    vi.stubEnv("DATABASE_URL", "");
    const { getIncidentStore, getCoordinationStore } = await import("./stores");
    await expect(
      getIncidentStore().createIncident({
        affectsSelf: true,
        emergencyType: "Probe",
        triage: [],
        idempotencyKey: "selector-fail-1",
      }),
    ).rejects.toThrow(/DATABASE_URL/);
    await expect(
      getCoordinationStore().listDispatches("nope"),
    ).rejects.toThrow(/DATABASE_URL/);
  });

  it("serves memory outside production when no database is configured", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getIncidentStore } = await import("./stores");
    const store = getIncidentStore();
    const rec = await store.createIncident({
      affectsSelf: true,
      emergencyType: "Selector probe",
      triage: [],
      idempotencyKey: "selector-key-1",
    });
    expect(rec.id).toBeTruthy();
  });
});
