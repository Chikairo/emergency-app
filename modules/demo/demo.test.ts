import { describe, expect, it } from "vitest";
import { normalizeWhatsAppNumber, whatsAppChatUrl } from "./doctor";
import { illustrativeEtaMinutes, markerPosition } from "./geo";
import { MemoryDemoStore } from "./store";

function launch(store: MemoryDemoStore, key = `demo-${Math.random().toString(36).slice(2)}`) {
  return store.createDemo("demo-hospital-ikeja", key);
}

describe("demo sessions (simulated, agency-driven)", () => {
  it("launches with an availability request and separate role tokens", () => {
    const store = new MemoryDemoStore();
    const s = launch(store);
    expect(s.status).toBe("AVAILABILITY_REQUESTED");
    expect(s.progress).toBe(0);
    expect(s.patientToken).toBeTruthy();
    expect(s.agencyToken).toBeTruthy();
    expect(s.patientToken).not.toBe(s.agencyToken);
    expect(s.events.map((e) => e.kind)).toEqual(["launched", "availability-requested"]);
  });

  it("is idempotent on launch with the same key", () => {
    const store = new MemoryDemoStore();
    const a = store.createDemo("demo-hospital-ikeja", "same-key-1234");
    const b = store.createDemo("demo-clinic-surulere", "same-key-1234");
    expect(b.id).toBe(a.id);
    expect(b.destination).toBe("demo-hospital-ikeja");
  });

  it("approves, dispatches, and starts the journey only on agency approval", () => {
    const store = new MemoryDemoStore();
    const s = launch(store);
    const approved = store.applyAction(s.id, {
      action: "approve",
      token: s.agencyToken,
      idempotencyKey: "act-approve-1",
    });
    expect(approved.status).toBe("EN_ROUTE");
    expect(approved.progress).toBe(0);
    expect(approved.events.some((e) => e.kind === "dispatched")).toBe(true);
  });

  it("rejects patient approval and movement before approval", () => {
    const store = new MemoryDemoStore();
    const s = launch(store);
    expect(() =>
      store.applyAction(s.id, { action: "approve", token: s.patientToken, idempotencyKey: "x-1-234567" }),
    ).toThrow(/only the agency/i);
    expect(() =>
      store.applyAction(s.id, { action: "advance", token: s.agencyToken, idempotencyKey: "x-2-234567" }),
    ).toThrow(/only.*after dispatch approval|only.*en route/i);
    expect(() =>
      store.applyAction(s.id, { action: "arrive", token: s.agencyToken, idempotencyKey: "x-3-234567" }),
    ).toThrow(/only.*while en route|en route/i);
    expect(store.getDemo(s.id)?.progress).toBe(0);
  });

  it("supports decline then later approval", () => {
    const store = new MemoryDemoStore();
    const s = launch(store);
    const declined = store.applyAction(s.id, {
      action: "decline",
      token: s.agencyToken,
      idempotencyKey: "act-decline-1",
    });
    expect(declined.status).toBe("DECLINED");
    const reconsidered = store.applyAction(s.id, {
      action: "reconsider",
      token: s.agencyToken,
      idempotencyKey: "act-recon-1",
    });
    expect(reconsidered.status).toBe("AVAILABILITY_REQUESTED");
    const approved = store.applyAction(s.id, {
      action: "approve",
      token: s.agencyToken,
      idempotencyKey: "act-approve-2",
    });
    expect(approved.status).toBe("EN_ROUTE");
  });

  it("advances deterministically and arrives only via agency control", () => {
    const store = new MemoryDemoStore();
    const s = launch(store);
    store.applyAction(s.id, { action: "approve", token: s.agencyToken, idempotencyKey: "a-1-2345678" });
    const moved = store.applyAction(s.id, {
      action: "advance",
      token: s.agencyToken,
      idempotencyKey: "a-2-2345678",
    });
    expect(moved.progress).toBe(25);
    const arrived = store.applyAction(s.id, {
      action: "arrive",
      token: s.agencyToken,
      idempotencyKey: "a-3-2345678",
    });
    expect(arrived.status).toBe("ARRIVED");
    expect(arrived.progress).toBe(100);
    expect(arrived.etaMinutes).toBe(0);
  });

  it("rejects unknown tokens without revealing the session", () => {
    const store = new MemoryDemoStore();
    const s = launch(store);
    expect(() =>
      store.applyAction(s.id, { action: "approve", token: "wrong-token-123", idempotencyKey: "z-12345678" }),
    ).toThrow(/does not grant access/i);
  });

  it("replays duplicate actions without side effects", () => {
    const store = new MemoryDemoStore();
    const s = launch(store);
    const body = { action: "approve", token: s.agencyToken, idempotencyKey: "dup-key-123" } as const;
    const a = store.applyAction(s.id, body);
    const b = store.applyAction(s.id, body);
    expect(b.events.length).toBe(a.events.length);
  });
});

describe("demo geography (illustrative, never telemetry)", () => {
  it("derives ETA from progress and clamps the marker", () => {
    expect(illustrativeEtaMinutes(0)).toBe(12);
    expect(illustrativeEtaMinutes(50)).toBe(6);
    expect(illustrativeEtaMinutes(100)).toBe(0);
    expect(markerPosition(-5)).toBe(0);
    expect(markerPosition(140)).toBe(100);
  });
});

describe("doctor contact links (no private data in code)", () => {
  it("formats international numbers into wa.me links", () => {
    expect(normalizeWhatsAppNumber("+234 801 234 5678")).toBe("2348012345678");
    const url = whatsAppChatUrl("+2348012345678", "Hello demo");
    expect(url).toBe("https://wa.me/2348012345678?text=Hello%20demo");
  });

  it("returns null when unconfigured or invalid", () => {
    expect(whatsAppChatUrl(undefined, "hi")).toBeNull();
    expect(whatsAppChatUrl("", "hi")).toBeNull();
    expect(whatsAppChatUrl("12", "hi")).toBeNull();
    expect(normalizeWhatsAppNumber("abc")).toBeNull();
  });
});
