import { describe, expect, it } from "vitest";
import { CoordinationStore } from "./store";

describe("CoordinationStore (mock provider, honest states)", () => {
  it("dispatch: SENT first, ack only after send, confirm only after ack", async () => {
    const store = new CoordinationStore();
    const req = await store.requestDispatch("inc-1", {
      targetType: "ambulance-partner",
      targetName: "Mock Ambulance Co.",
      idempotencyKey: "dispatch-key-1",
    });
    expect(req.state).toBe("SENT");
    expect(req.simulated).toBe(false);
    await expect(store.simulateDispatchConfirm(req.id)).rejects.toThrow(/acknowledgement/i);
    const acked = await store.simulateDispatchAck(req.id);
    expect(acked.state).toBe("ACKNOWLEDGED");
    expect(acked.simulated).toBe(true);
    const confirmed = await store.simulateDispatchConfirm(req.id);
    expect(confirmed.state).toBe("ACCEPTED");
  });

  it("dispatch create is idempotent", async () => {
    const store = new CoordinationStore();
    const body = {
      targetType: "emergency-service",
      targetName: "Mock Dispatch",
      idempotencyKey: "dispatch-dup-1",
    } as const;
    const a = await store.requestDispatch("inc-1", body);
    const b = await store.requestDispatch("inc-1", body);
    expect(b.id).toBe(a.id);
    expect(await store.listDispatches("inc-1")).toHaveLength(1);
  });

  it("records human availability separately from dispatch and deduplicates retries", async () => {
    const store = new CoordinationStore();
    const input = { targetName: "Ambulance A1", idempotencyKey: "available-step-key-1" };
    const first = await store.recordAmbulanceAvailability("inc-1", input);
    const retry = await store.recordAmbulanceAvailability("inc-1", input);
    expect(first.id).toBe(retry.id);
    expect(first.state).toBe("ACKNOWLEDGED");
    expect(first.simulated).toBe(false);
    expect(await store.findDispatchByIdempotencyKey("inc-1", input.idempotencyKey)).toMatchObject({
      id: first.id,
      state: "ACKNOWLEDGED",
    });
    expect(await store.listDispatches("inc-1")).toHaveLength(1);
  });

  it("med-pro: pending, accept, and stale expiry fallback", async () => {
    const store = new CoordinationStore();
    const req = await store.requestMedpro("inc-1", "medpro-key-12");
    expect(req.state).toBe("PENDING");
    const accepted = await store.simulateMedproAccept(req.id);
    expect(accepted.simulated).toBe(true);
    const stale = await store.requestMedpro("inc-2", "medpro-key-34");
    const expired = await store.expireStaleMedpro(0, new Date(Date.now() + 60_000));
    expect(expired).toBe(1);
    expect((await store.listMedpro("inc-2"))[0]?.state).toBe("EXPIRED");
    expect(stale.state).toBe("EXPIRED");
  });

  it("responders: verified assignable, unverified rejected", async () => {
    const store = new CoordinationStore();
    const a = await store.assignResponder("inc-1", {
      responderEmail: "responder@example.com",
      idempotencyKey: "assign-key-123",
    });
    expect(a.verified).toBe(true);
    expect(a.state).toBe("PENDING");
    await expect(
      store.assignResponder("inc-1", {
        responderEmail: "unverified.vol@example.com",
        idempotencyKey: "assign-key-456",
      }),
    ).rejects.toThrow(/not verified/i);
    const acked = await store.acknowledgeAssignment(a.id);
    expect(acked.state).toBe("ACKNOWLEDGED");
  });

  it("contacts: consent required, notify records SENT not delivered", async () => {
    const store = new CoordinationStore();
    const c = await store.addContact("inc-1", {
      name: "Ama",
      channel: "SMS",
      address: "+000-111-2222",
      consent: true,
    });
    expect(c.consentAt).toBeInstanceOf(Date);
    const sent = await store.notifyContacts("inc-1");
    expect(sent).toHaveLength(1);
    expect(sent[0]?.state).toBe("SENT");
    expect(sent[0]?.simulated).toBe(true);
    expect((await store.listContacts("inc-1"))[0]?.lastDelivery).toBe("SENT");
  });
});
