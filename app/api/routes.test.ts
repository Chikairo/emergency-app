import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as health } from "@/app/api/health/route";
import { GET as listAll, POST as create } from "@/app/api/incidents/route";
import { GET as getOne } from "@/app/api/incidents/[id]/route";
import { PATCH as setLocation } from "@/app/api/incidents/[id]/location/route";
import { POST as setStatus } from "@/app/api/incidents/[id]/status/route";
import { GET as guidance } from "@/app/api/guidance/route";
import { POST as requestDispatch } from "@/app/api/incidents/[id]/dispatch/route";
import { POST as dispatchAck } from "@/app/api/dispatch/[reqId]/ack/route";
import { POST as dispatchConfirm } from "@/app/api/dispatch/[reqId]/confirm/route";
import { POST as requestMedpro } from "@/app/api/incidents/[id]/medpro/route";
import { POST as medproAccept } from "@/app/api/medpro/[reqId]/accept/route";
import { GET as roster } from "@/app/api/responders/route";
import { POST as assign } from "@/app/api/incidents/[id]/assign/route";
import { POST as assignmentAck } from "@/app/api/assignments/[aid]/ack/route";
import { POST as addContact } from "@/app/api/incidents/[id]/contacts/route";
import { POST as notify } from "@/app/api/incidents/[id]/notify/route";
import { POST as close } from "@/app/api/incidents/[id]/close/route";

function jsonRequest(url: string, method: string, body: unknown): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Session boundary stub: production reads the Better Auth cookie.
// null = anonymous urgent flow; STAFF/OWNER/OTHER switch per test.
const mockUser = vi.hoisted(() => ({
  value: null as null | { id: string; email: string; role: string; facilityId: string | null },
}));
vi.mock("@/lib/auth-session", () => ({
  getRequestUser: async () => mockUser.value,
}));

const STAFF = { id: "staff-1", email: "dispatcher@example.com", role: "DISPATCHER", facilityId: null };
const OWNER = { id: "owner-1", email: "owner@example.com", role: "BYSTANDER", facilityId: null };
const OTHER = { id: "other-9", email: "other@example.com", role: "BYSTANDER", facilityId: null };

beforeEach(() => {
  mockUser.value = null;
});

describe("emergency API (mock integrations, honest states)", () => {
  it("health reports ok with mock mode", async () => {
    const res = await health();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok" });
  });

  it("full report -> location -> status flow", async () => {
    const created = await create(
      jsonRequest("http://localhost/api/incidents", "POST", {
        affectsSelf: true,
        emergencyType: "Severe bleeding",
        idempotencyKey: "api-flow-key-1",
      }),
    );
    expect(created.status).toBe(201);
    const { incident } = (await created.json()) as { incident: { id: string; status: string } };
    expect(incident.status).toBe("REQUEST_STARTED");

    const located = await setLocation(
      jsonRequest("http://localhost/api/incidents/x/location", "PATCH", {
        latitude: null,
        longitude: null,
        addressText: null,
        landmark: "Blue kiosk opposite the market",
        locationState: "approximate",
      }),
      { params: Promise.resolve({ id: incident.id }) },
    );
    expect(located.status).toBe(200);

    const progressed = await setStatus(
      jsonRequest("http://localhost/api/incidents/x/status", "POST", {
        to: "REQUEST_SENT",
        idempotencyKey: "api-flow-ev-1",
      }),
      { params: Promise.resolve({ id: incident.id }) },
    );
    expect(progressed.status).toBe(200);

    // False dispatch rejected, never recorded.
    const bogus = await setStatus(
      jsonRequest("http://localhost/api/incidents/x/status", "POST", {
        to: "DISPATCHED_ACCEPTED",
        idempotencyKey: "api-flow-ev-2",
      }),
      { params: Promise.resolve({ id: incident.id }) },
    );
    expect(bogus.status).toBe(422);

    const fetched = await getOne(new Request("http://localhost/api/incidents/x"), {
      params: Promise.resolve({ id: incident.id }),
    });
    const { incident: current } = (await fetched.json()) as {
      incident: { status: string };
    };
    expect(current.status).toBe("REQUEST_SENT");
  });

  it("returns 400 for invalid reports and 404 for unknown ids", async () => {
    const bad = await create(
      jsonRequest("http://localhost/api/incidents", "POST", {
        affectsSelf: true,
        emergencyType: "",
        idempotencyKey: "short",
      }),
    );
    expect(bad.status).toBe(400);
    const missing = await getOne(new Request("http://localhost/api/incidents/nope"), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(missing.status).toBe(404);
  });

  it("serves guidance bundles and 404s unknown slugs", async () => {
    const ok = await guidance(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { nextUrl: new URL("http://localhost/api/guidance?slug=sample-bleeding") } as any,
    );
    expect(ok.status).toBe(200);
    const { guidance: bundle } = (await ok.json()) as {
      guidance: { status: string };
    };
    expect(bundle.status).toBe("DRAFT");
    const missing = await guidance(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { nextUrl: new URL("http://localhost/api/guidance?slug=nope") } as any,
    );
    expect(missing.status).toBe(404);
  });
});

describe("authorization (unauthenticated rejected, records isolated)", () => {
  it("rejects staff-only endpoints without a session (401)", async () => {
    mockUser.value = null;
    const ops = await listAll(new Request("http://localhost/api/incidents"));
    expect(ops.status).toBe(401);
    const denied = await requestDispatch(
      jsonRequest("http://localhost/d", "POST", {
        targetType: "ambulance-partner",
        targetName: "Mock",
        idempotencyKey: "auth-401-key-1",
      }),
      { params: Promise.resolve({ id: "whatever" }) },
    );
    expect(denied.status).toBe(401);
  });

  it("isolates owned incidents: owner reads, others get 404, anonymous denied", async () => {
    mockUser.value = OWNER;
    const created = await create(
      jsonRequest("http://localhost/api/incidents", "POST", {
        affectsSelf: true,
        emergencyType: "Owned emergency",
        idempotencyKey: "auth-owned-key-1",
      }),
    );
    expect(created.status).toBe(201);
    const { incident } = (await created.json()) as { incident: { id: string } };

    mockUser.value = OTHER;
    const foreign = await getOne(new Request(`http://localhost/api/incidents/${incident.id}`), {
      params: Promise.resolve({ id: incident.id }),
    });
    expect(foreign.status).toBe(404);

    mockUser.value = null;
    const anon = await getOne(new Request(`http://localhost/api/incidents/${incident.id}`), {
      params: Promise.resolve({ id: incident.id }),
    });
    expect(anon.status).toBe(404);

    mockUser.value = OWNER;
    const own = await getOne(new Request(`http://localhost/api/incidents/${incident.id}`), {
      params: Promise.resolve({ id: incident.id }),
    });
    expect(own.status).toBe(200);
  });

  it("audits incident creation", async () => {
    const { auditBuffer, clearAuditBuffer } = await import("@/lib/audit");
    clearAuditBuffer();
    mockUser.value = null;
    await create(
      jsonRequest("http://localhost/api/incidents", "POST", {
        affectsSelf: true,
        emergencyType: "Audited emergency",
        idempotencyKey: "auth-audit-key-1",
      }),
    );
    expect(auditBuffer.some((e) => e.action === "incident.created")).toBe(true);
  });
});

describe("coordination API (Phase 2, mock providers)", () => {
  beforeEach(() => {
    mockUser.value = STAFF;
  });
  async function makeIncident(key: string): Promise<string> {
    const res = await create(
      jsonRequest("http://localhost/api/incidents", "POST", {
        affectsSelf: false,
        emergencyType: "Test emergency",
        idempotencyKey: key,
      }),
    );
    const { incident } = (await res.json()) as { incident: { id: string } };
    return incident.id;
  }

  const p = (id: string) => ({ params: Promise.resolve({ id }) });

  it("dispatch stays SENT until mock ack then confirm, in order", async () => {
    const id = await makeIncident("coord-dispatch-1");
    const created = await requestDispatch(
      jsonRequest("http://localhost/d", "POST", {
        targetType: "ambulance-partner",
        targetName: "Mock Ambulance Co.",
        idempotencyKey: "coord-d-key-1",
      }),
      p(id),
    );
    expect(created.status).toBe(201);
    const { dispatch } = (await created.json()) as { dispatch: { id: string; state: string; simulated: boolean } };
    expect(dispatch.state).toBe("SENT");
    expect(dispatch.simulated).toBe(false);

    const early = await dispatchConfirm(new Request("http://localhost/c", { method: "POST" }), {
      params: Promise.resolve({ reqId: dispatch.id }),
    });
    expect(early.status).toBe(422);

    const acked = await dispatchAck(new Request("http://localhost/a", { method: "POST" }), {
      params: Promise.resolve({ reqId: dispatch.id }),
    });
    expect((await acked.json() as { dispatch: { simulated: boolean } }).dispatch.simulated).toBe(true);
    const confirmed = await dispatchConfirm(new Request("http://localhost/c", { method: "POST" }), {
      params: Promise.resolve({ reqId: dispatch.id }),
    });
    expect(confirmed.status).toBe(200);
  });

  it("med-pro request starts PENDING and accepts via mock", async () => {
    const id = await makeIncident("coord-medpro-1");
    const created = await requestMedpro(
      jsonRequest("http://localhost/m", "POST", { idempotencyKey: "coord-m-key-1" }),
      p(id),
    );
    expect(created.status).toBe(201);
    const { medpro } = (await created.json()) as { medpro: { id: string; state: string; provider: string } };
    expect(medpro.state).toBe("PENDING");
    expect(medpro.provider).toBe("mock");
    const accepted = await medproAccept(new Request("http://localhost/ma", { method: "POST" }), {
      params: Promise.resolve({ reqId: medpro.id }),
    });
    expect(accepted.status).toBe(200);
  });

  it("only verified responders can be assigned; ack works", async () => {
    const id = await makeIncident("coord-resp-1");
    const list = await roster();
    const { responders } = (await list.json()) as { responders: { email: string; verified: boolean }[] };
    expect(responders.length).toBeGreaterThan(0);

    const denied = await assign(
      jsonRequest("http://localhost/as", "POST", {
        responderEmail: "unverified.vol@example.com",
        idempotencyKey: "coord-a-deny-1",
      }),
      p(id),
    );
    expect(denied.status).toBe(422);

    const allowed = await assign(
      jsonRequest("http://localhost/as", "POST", {
        responderEmail: "responder@example.com",
        idempotencyKey: "coord-a-ok-1",
      }),
      p(id),
    );
    expect(allowed.status).toBe(201);
    const { assignment } = (await allowed.json()) as { assignment: { id: string } };
    const acked = await assignmentAck(new Request("http://localhost/aa", { method: "POST" }), {
      params: Promise.resolve({ aid: assignment.id }),
    });
    expect(acked.status).toBe(200);
  });

  it("trusted contacts need consent; notify records SENT", async () => {
    const id = await makeIncident("coord-contact-1");
    const noConsent = await addContact(
      jsonRequest("http://localhost/c", "POST", {
        name: "Ama",
        channel: "SMS",
        address: "+000-111-2222",
      }),
      p(id),
    );
    expect(noConsent.status).toBe(400);
    const added = await addContact(
      jsonRequest("http://localhost/c", "POST", {
        name: "Ama",
        channel: "SMS",
        address: "+000-111-2222",
        consent: true,
      }),
      p(id),
    );
    expect(added.status).toBe(201);
    const sent = await notify(new Request("http://localhost/n", { method: "POST" }), p(id));
    const { notifications } = (await sent.json()) as { notifications: { state: string }[] };
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.state).toBe("SENT");
  });

  it("closure follows transition rules (terminal states enforced)", async () => {
    const id = await makeIncident("coord-close-1");
    // Cannot complete straight from REQUEST_STARTED.
    const early = await close(
      jsonRequest("http://localhost/cl", "POST", {
        outcome: "completed",
        idempotencyKey: "coord-cl-early",
      }),
      p(id),
    );
    expect(early.status).toBe(422);
    const cancelled = await close(
      jsonRequest("http://localhost/cl", "POST", {
        outcome: "cancelled",
        reason: "Duplicate report",
        idempotencyKey: "coord-cl-ok-1",
      }),
      p(id),
    );
    expect(cancelled.status).toBe(200);
  });
});
