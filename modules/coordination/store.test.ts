import { describe, expect, it } from "vitest";
import { CoordinationStore } from "./store";

describe("CoordinationStore (mock provider, honest states)", () => {
  it("dispatch: SENT first, ack only after send, confirm only after ack", () => {
    const store = new CoordinationStore();
    const req = store.requestDispatch("inc-1", {
      targetType: "ambulance-partner",
      targetName: "Mock Ambulance Co.",
      idempotencyKey: "dispatch-key-1",
    });
    expect(req.state).toBe("SENT");
    expect(req.simulated).toBe(false);
    expect(() => store.simulateDispatchConfirm(req.id)).toThrow(/acknowledgement/i);
    const acked = store.simulateDispatchAck(req.id);
    expect(acked.state).toBe("ACKNOWLEDGED");
    expect(acked.simulated).toBe(true);
    const confirmed = store.simulateDispatchConfirm(req.id);
    expect(confirmed.state).toBe("ACCEPTED");
  });

  it("dispatch create is idempotent", () => {
    const store = new CoordinationStore();
    const body = {
      targetType: "emergency-service",
      targetName: "Mock Dispatch",
      idempotencyKey: "dispatch-dup-1",
    } as const;
    const a = store.requestDispatch("inc-1", body);
    const b = store.requestDispatch("inc-1", body);
    expect(b.id).toBe(a.id);
    expect(store.listDispatches("inc-1")).toHaveLength(1);
  });

  it("med-pro: pending, accept, and stale expiry fallback", () => {
    const store = new CoordinationStore();
    const req = store.requestMedpro("inc-1", "medpro-key-12");
    expect(req.state).toBe("PENDING");
    const accepted = store.simulateMedproAccept(req.id);
    expect(accepted.simulated).toBe(true);
    const stale = store.requestMedpro("inc-2", "medpro-key-34");
    const expired = store.expireStaleMedpro(0, new Date(Date.now() + 60_000));
    expect(expired).toBe(1);
    expect(store.listMedpro("inc-2")[0]?.state).toBe("EXPIRED");
    expect(stale.state).toBe("EXPIRED");
  });

  it("responders: verified assignable, unverified rejected", () => {
    const store = new CoordinationStore();
    const a = store.assignResponder("inc-1", {
      responderEmail: "responder@example.com",
      idempotencyKey: "assign-key-123",
    });
    expect(a.verified).toBe(true);
    expect(a.state).toBe("PENDING");
    expect(() =>
      store.assignResponder("inc-1", {
        responderEmail: "unverified.vol@example.com",
        idempotencyKey: "assign-key-456",
      }),
    ).toThrow(/not verified/i);
    const acked = store.acknowledgeAssignment(a.id);
    expect(acked.state).toBe("ACKNOWLEDGED");
  });

  it("contacts: consent required, notify records SENT not delivered", () => {
    const store = new CoordinationStore();
    const c = store.addContact("inc-1", {
      name: "Ama",
      channel: "SMS",
      address: "+000-111-2222",
      consent: true,
    });
    expect(c.consentAt).toBeInstanceOf(Date);
    const sent = store.notifyContacts("inc-1");
    expect(sent).toHaveLength(1);
    expect(sent[0]?.state).toBe("SENT");
    expect(sent[0]?.simulated).toBe(true);
    expect(store.listContacts("inc-1")[0]?.lastDelivery).toBe("SENT");
  });
});
