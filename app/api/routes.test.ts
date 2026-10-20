import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as health } from "@/app/api/health/route";
import { GET as listAll, POST as create } from "@/app/api/incidents/route";
import { GET as getOne } from "@/app/api/incidents/[id]/route";
import { POST as notifyWhatsapp } from "@/app/api/incidents/[id]/notify-whatsapp/route";
import { POST as createCall } from "@/app/api/incidents/[id]/call/route";
import { POST as joinCall } from "@/app/api/incidents/[id]/call/join/route";
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
import { POST as dispatcherAck } from "@/app/api/assignments/[aid]/dispatcher-ack/route";
import { POST as addContact } from "@/app/api/incidents/[id]/contacts/route";
import { POST as notify } from "@/app/api/incidents/[id]/notify/route";
import { POST as close } from "@/app/api/incidents/[id]/close/route";
import { GET as doctorContact } from "@/app/api/incidents/[id]/doctor-contact/route";
import { POST as ambulance } from "@/app/api/incidents/[id]/ambulance/route";
import { GET as listDispatches } from "@/app/api/incidents/[id]/dispatch/route";

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

    // False dispatch rejected, never recorded. Non-staff callers cannot
    // set dispatch states at all (403), so clients can't self-dispatch.
    const bogus = await setStatus(
      jsonRequest("http://localhost/api/incidents/x/status", "POST", {
        to: "DISPATCHED_ACCEPTED",
        idempotencyKey: "api-flow-ev-2",
      }),
      { params: Promise.resolve({ id: incident.id }) },
    );
    expect(bogus.status).toBe(403);

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

  it("creates one-tap incidents with safe defaults and dedupes retries", async () => {
    const payload = {
      affectsSelf: true,
      emergencyType: "Unspecified emergency",
      triage: [],
      idempotencyKey: "one-tap-dedupe-1",
    };
    mockUser.value = null;
    const first = await create(jsonRequest("http://localhost/api/incidents", "POST", payload));
    expect(first.status).toBe(201);
    const firstBody = (await first.json()) as { incident: { id: string; status: string } };
    expect(firstBody.incident.status).toBe("REQUEST_STARTED");
    const retry = await create(jsonRequest("http://localhost/api/incidents", "POST", payload));
    expect(retry.status).toBe(201);
    const retryBody = (await retry.json()) as { incident: { id: string } };
    expect(retryBody.incident.id).toBe(firstBody.incident.id);
  });

  it("refuses owner-set acknowledgement and dispatch states", async () => {
    mockUser.value = OWNER;
    const created = await create(
      jsonRequest("http://localhost/api/incidents", "POST", {
        affectsSelf: true,
        emergencyType: "Forge probe",
        idempotencyKey: "forge-probe-1",
      }),
    );
    const { incident } = (await created.json()) as { incident: { id: string } };
    const p = { params: Promise.resolve({ id: incident.id }) };
    const ack = await setStatus(
      jsonRequest("http://localhost/s", "POST", { to: "ACKNOWLEDGED", idempotencyKey: "forge-ack-1" }),
      p,
    );
    expect(ack.status).toBe(403);
    const dispatched = await setStatus(
      jsonRequest("http://localhost/s", "POST", { to: "DISPATCHED_ACCEPTED", idempotencyKey: "forge-disp-1" }),
      p,
    );
    expect(dispatched.status).toBe(403);
    const still = await getOne(new Request(`http://localhost/api/incidents/${incident.id}`), p);
    const { incident: current } = (await still.json()) as { incident: { status: string } };
    expect(current.status).toBe("REQUEST_STARTED");
  });

  it("lets staff record acknowledgement states", async () => {
    mockUser.value = STAFF;
    const created = await create(
      jsonRequest("http://localhost/api/incidents", "POST", {
        affectsSelf: false,
        emergencyType: "Staff ack probe",
        idempotencyKey: "staff-ack-1",
      }),
    );
    const { incident } = (await created.json()) as { incident: { id: string } };
    const p = { params: Promise.resolve({ id: incident.id }) };
    const sent = await setStatus(
      jsonRequest("http://localhost/s", "POST", { to: "REQUEST_SENT", idempotencyKey: "staff-ack-ev1" }),
      p,
    );
    expect(sent.status).toBe(200);
    const acked = await setStatus(
      jsonRequest("http://localhost/s", "POST", { to: "ACKNOWLEDGED", idempotencyKey: "staff-ack-ev2" }),
      p,
    );
    expect(acked.status).toBe(200);
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

  it("grants the incident list to medical roles but not responders", async () => {
    mockUser.value = {
      id: "med-1",
      email: "medpro@example.com",
      role: "MEDICAL_PROFESSIONAL",
      facilityId: null,
    };
    const allowed = await listAll(new Request("http://localhost/api/incidents"));
    expect(allowed.status).toBe(200);
    const body = (await allowed.json()) as { incidents: unknown[] };
    expect(Array.isArray(body.incidents)).toBe(true);

    mockUser.value = {
      id: "resp-1",
      email: "responder@example.com",
      role: "RESPONDER",
      facilityId: null,
    };
    const denied = await listAll(new Request("http://localhost/api/incidents"));
    expect(denied.status).toBe(403);
  });

  it("restricts the dispatcher queue to authorized staff and shows new incidents", async () => {
    mockUser.value = null;
    expect((await listAll(new Request("http://localhost/api/incidents"))).status).toBe(401);
    mockUser.value = OTHER;
    expect((await listAll(new Request("http://localhost/api/incidents"))).status).toBe(403);
    mockUser.value = STAFF;
    const created = await create(
      jsonRequest("http://localhost/api/incidents", "POST", {
        affectsSelf: true,
        emergencyType: "Queue visibility probe",
        idempotencyKey: "ops-queue-1",
      }),
    );
    expect(created.status).toBe(201);
    const { incident } = (await created.json()) as { incident: { id: string } };
    const listed = await listAll(new Request("http://localhost/api/incidents"));
    expect(listed.status).toBe(200);
    const body = (await listed.json()) as { incidents: { id: string }[] };
    expect(body.incidents.some((i) => i.id === incident.id)).toBe(true);
  });
});

describe("doctor contact (configured number or honest fallback)", () => {
  async function ownedIncident(key: string): Promise<string> {
    mockUser.value = OWNER;
    const res = await create(
      jsonRequest("http://localhost/api/incidents", "POST", {
        affectsSelf: true,
        emergencyType: "Doctor contact probe",
        idempotencyKey: key,
      }),
    );
    const { incident } = (await res.json()) as { incident: { id: string } };
    return incident.id;
  }

  const p = (id: string) => ({ params: Promise.resolve({ id }) });

  it("reports unconfigured without inventing a number", async () => {
    mockUser.value = OWNER;
    const id = await ownedIncident("doc-unconfigured-1");
    const res = await doctorContact(
      new Request(`http://localhost/api/incidents/${id}/doctor-contact`),
      p(id),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { configured: boolean };
    expect(body.configured).toBe(false);
  });

  it("serves tel and WhatsApp links only when configured", async () => {
    vi.stubEnv("DOCTOR_WHATSAPP_NUMBER", "+2348012345678");
    mockUser.value = OWNER;
    const id = await ownedIncident("doc-configured-1");
    const res = await doctorContact(
      new Request(`http://localhost/api/incidents/${id}/doctor-contact`),
      p(id),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      configured: boolean;
      telHref: string;
      whatsappUrl: string;
    };
    expect(body.configured).toBe(true);
    expect(body.telHref).toBe("tel:+2348012345678");
    expect(body.whatsappUrl).toMatch(/^https:\/\/wa\.me\/2348012345678\?text=/);
    vi.unstubAllEnvs();
  });

  it("hides other users' incidents as 404", async () => {
    mockUser.value = OWNER;
    const id = await ownedIncident("doc-other-1");
    mockUser.value = OTHER;
    const res = await doctorContact(
      new Request(`http://localhost/api/incidents/${id}/doctor-contact`),
      p(id),
    );
    expect(res.status).toBe(404);
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
    const list = await roster(new Request("http://localhost/api/responders"));
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
    const acked = await dispatcherAck(new Request("http://localhost/aa", { method: "POST" }), {
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

  it("returns 404 for ack/confirm/accept on unknown ids", async () => {
    const post = (url: string) => new Request(url, { method: "POST" });
    const acked = await dispatchAck(post("http://localhost/a"), {
      params: Promise.resolve({ reqId: "no-such-dispatch" }),
    });
    expect(acked.status).toBe(404);
    const confirmed = await dispatchConfirm(post("http://localhost/c"), {
      params: Promise.resolve({ reqId: "no-such-dispatch" }),
    });
    expect(confirmed.status).toBe(404);
    const accepted = await medproAccept(post("http://localhost/ma"), {
      params: Promise.resolve({ reqId: "no-such-medpro" }),
    });
    expect(accepted.status).toBe(404);
    mockUser.value = {
      id: "resp-7",
      email: "responder@example.com",
      role: "RESPONDER",
      facilityId: null,
    };
    const assignmentAcked = await assignmentAck(post("http://localhost/aa"), {
      params: Promise.resolve({ aid: "no-such-assignment" }),
    });
    expect(assignmentAcked.status).toBe(404);
  });

  it("rejects acknowledgement paths without session or role", async () => {
    const post = (url: string) => new Request(url, { method: "POST" });
    mockUser.value = null;
    const anon = await dispatchAck(post("http://localhost/a"), {
      params: Promise.resolve({ reqId: "whatever" }),
    });
    expect(anon.status).toBe(401);
    mockUser.value = OWNER;
    const wrongRole = await dispatchAck(post("http://localhost/a"), {
      params: Promise.resolve({ reqId: "whatever" }),
    });
    expect(wrongRole.status).toBe(403);
    mockUser.value = null;
    const anonAssign = await assignmentAck(post("http://localhost/aa"), {
      params: Promise.resolve({ aid: "whatever" }),
    });
    expect(anonAssign.status).toBe(401);
  });

  it("returns 404 for responder assignment ack on unknown ids", async () => {
    mockUser.value = {
      id: "resp-7",
      email: "responder@example.com",
      role: "RESPONDER",
      facilityId: null,
    };
    const res = await assignmentAck(new Request("http://localhost/aa", { method: "POST" }), {
      params: Promise.resolve({ aid: "no-such-assignment" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("assignment self-acknowledgement (strict responder match)", () => {
  const RESP_A = { id: "resp-a", email: "responder@example.com", role: "RESPONDER", facilityId: null };
  const RESP_B = { id: "resp-b", email: "kofi.medic@example.com", role: "RESPONDER", facilityId: null };
  const post = (url: string, body?: unknown) =>
    body === undefined
      ? new Request(url, { method: "POST" })
      : jsonRequest(url, "POST", body);

  async function assignedAid(key: string, email: string): Promise<string> {
    mockUser.value = STAFF;
    const created = await create(
      jsonRequest("http://localhost/api/incidents", "POST", {
        affectsSelf: false,
        emergencyType: "Self-ack probe",
        idempotencyKey: key,
      }),
    );
    const { incident } = (await created.json()) as { incident: { id: string } };
    const assigned = await assign(
      jsonRequest("http://localhost/as", "POST", {
        responderEmail: email,
        idempotencyKey: `${key}-assign`,
      }),
      { params: Promise.resolve({ id: incident.id }) },
    );
    expect(assigned.status).toBe(201);
    const { assignment } = (await assigned.json()) as { assignment: { id: string } };
    return assignment.id;
  }

  it("lets the assigned responder acknowledge their own assignment", async () => {
    const aid = await assignedAid("selfack-own-1", RESP_A.email);
    mockUser.value = RESP_A;
    const res = await assignmentAck(post("http://localhost/aa"), {
      params: Promise.resolve({ aid }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { assignment: { state: string } };
    expect(body.assignment.state).toBe("ACKNOWLEDGED");
  });

  it("matches responder email case-insensitively", async () => {
    const aid = await assignedAid("selfack-case-1", RESP_A.email);
    mockUser.value = { ...RESP_A, email: "Responder@Example.com" };
    const res = await assignmentAck(post("http://localhost/aa"), {
      params: Promise.resolve({ aid }),
    });
    expect(res.status).toBe(200);
  });

  it("rejects cross-responder acknowledgement without mutating state", async () => {
    const aid = await assignedAid("selfack-cross-1", RESP_A.email);
    mockUser.value = RESP_B;
    const denied = await assignmentAck(post("http://localhost/aa"), {
      params: Promise.resolve({ aid }),
    });
    expect(denied.status).toBe(403);
    // The failed attempt changed nothing: the owner still acknowledges cleanly.
    mockUser.value = RESP_A;
    const retry = await assignmentAck(post("http://localhost/aa"), {
      params: Promise.resolve({ aid }),
    });
    expect(retry.status).toBe(200);
  });

  it("ignores request-body and query impersonation attempts", async () => {
    const aid = await assignedAid("selfack-spoof-1", RESP_A.email);
    mockUser.value = RESP_B;
    const spoofed = await assignmentAck(
      post(`http://localhost/aa?responderEmail=${encodeURIComponent(RESP_A.email)}`, {
        responderEmail: RESP_A.email,
      }),
      { params: Promise.resolve({ aid }) },
    );
    expect(spoofed.status).toBe(403);
  });

  it("rejects dispatchers on the responder endpoint (no bypass)", async () => {
    const aid = await assignedAid("selfack-nobypass-1", RESP_A.email);
    mockUser.value = STAFF;
    const res = await assignmentAck(post("http://localhost/aa"), {
      params: Promise.resolve({ aid }),
    });
    expect(res.status).toBe(403);
  });

  it("serves dispatcher acknowledgement through the separate endpoint", async () => {
    const aid = await assignedAid("selfack-disp-1", RESP_A.email);
    mockUser.value = STAFF;
    const res = await dispatcherAck(post("http://localhost/aa"), {
      params: Promise.resolve({ aid }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { assignment: { state: string } };
    expect(body.assignment.state).toBe("ACKNOWLEDGED");
  });

  it("rejects responders and non-dispatchers on the dispatcher endpoint", async () => {
    const aid = await assignedAid("selfack-disprole-1", RESP_A.email);
    mockUser.value = RESP_A;
    expect(
      (await dispatcherAck(post("http://localhost/aa"), { params: Promise.resolve({ aid }) })).status,
    ).toBe(403);
    mockUser.value = OWNER;
    expect(
      (await dispatcherAck(post("http://localhost/aa"), { params: Promise.resolve({ aid }) })).status,
    ).toBe(403);
    mockUser.value = null;
    expect(
      (await dispatcherAck(post("http://localhost/aa"), { params: Promise.resolve({ aid }) })).status,
    ).toBe(401);
  });

  it("returns 404 for dispatcher action on unknown assignments", async () => {
    mockUser.value = STAFF;
    const res = await dispatcherAck(post("http://localhost/aa"), {
      params: Promise.resolve({ aid: "no-such-assignment" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("ambulance decisions (human-confirmed, non-simulated)", () => {
  const STAFF2 = { id: "staff-9", email: "dispatcher9@example.com", role: "DISPATCHER", facilityId: null };

  async function sentIncident(key: string): Promise<string> {
    mockUser.value = STAFF2;
    const created = await create(
      jsonRequest("http://localhost/api/incidents", "POST", {
        affectsSelf: true,
        emergencyType: "Ambulance probe",
        idempotencyKey: key,
      }),
    );
    const { incident } = (await created.json()) as { incident: { id: string } };
    await setStatus(
      jsonRequest("http://localhost/s", "POST", {
        to: "REQUEST_SENT",
        idempotencyKey: `${key}-ev`,
      }),
      { params: Promise.resolve({ id: incident.id }) },
    );
    return incident.id;
  }

  const ap = (id: string) => ({ params: Promise.resolve({ id }) });

  it("confirms an ambulance and advances along the legal path", async () => {
    mockUser.value = STAFF2;
    const id = await sentIncident("amb-confirm-1");
    const res = await ambulance(
      jsonRequest("http://localhost/a", "POST", {
        decision: "confirm",
        vehicle: "Ambulance A12",
        idempotencyKey: "amb-confirm-key-1",
      }),
      ap(id),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      dispatch: { state: string; simulated: boolean; targetName: string };
      incident: { status: string };
    };
    expect(body.dispatch.state).toBe("ACCEPTED");
    expect(body.dispatch.simulated).toBe(false);
    expect(body.dispatch.targetName).toBe("Ambulance A12");
    expect(body.incident.status).toBe("DISPATCHED_ACCEPTED");
  });

  it("records a decline without changing status", async () => {
    mockUser.value = STAFF2;
    const id = await sentIncident("amb-decline-1");
    const res = await ambulance(
      jsonRequest("http://localhost/a", "POST", {
        decision: "decline",
        idempotencyKey: "amb-decline-key-1",
      }),
      ap(id),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      dispatch: { state: string; simulated: boolean };
      incident: { status: string };
    };
    expect(body.dispatch.state).toBe("DECLINED");
    expect(body.dispatch.simulated).toBe(false);
    expect(body.incident.status).toBe("REQUEST_SENT");
  });

  it("records ambulance availability without claiming dispatch, then requires an explicit dispatch decision", async () => {
    mockUser.value = STAFF2;
    const id = await sentIncident("amb-two-step-1");
    const available = await ambulance(
      jsonRequest("http://localhost/a", "POST", {
        decision: "available",
        vehicle: "Ambulance A20",
        idempotencyKey: "amb-two-step-available-1",
      }),
      ap(id),
    );
    expect(available.status).toBe(200);
    const availableBody = (await available.json()) as {
      dispatch: { state: string; simulated: boolean };
      incident: { status: string; events: { to: string; source: string | null }[] };
    };
    expect(availableBody.dispatch.state).toBe("ACKNOWLEDGED");
    expect(availableBody.dispatch.simulated).toBe(false);
    expect(availableBody.incident.status).toBe("ACKNOWLEDGED");
    expect(availableBody.incident.events.at(-1)).toMatchObject({
      to: "ACKNOWLEDGED",
      source: "dispatcher",
    });

    const dispatched = await ambulance(
      jsonRequest("http://localhost/a", "POST", {
        decision: "dispatch",
        vehicle: "Ambulance A20",
        idempotencyKey: "amb-two-step-dispatch-1",
      }),
      ap(id),
    );
    expect(dispatched.status).toBe(200);
    const dispatchBody = (await dispatched.json()) as {
      dispatch: { id: string; state: string; simulated: boolean };
      incident: { status: string };
    };
    expect(dispatchBody.dispatch.state).toBe("ACCEPTED");
    expect(dispatchBody.dispatch.simulated).toBe(false);
    expect(dispatchBody.incident.status).toBe("DISPATCHED_ACCEPTED");

    const retry = await ambulance(
      jsonRequest("http://localhost/a", "POST", {
        decision: "dispatch",
        vehicle: "Ambulance A20",
        idempotencyKey: "amb-two-step-dispatch-1",
      }),
      ap(id),
    );
    expect(retry.status).toBe(200);
    const retryBody = (await retry.json()) as {
      dispatch: { id: string; state: string; simulated: boolean };
    };
    expect(retryBody.dispatch.id).toBe(dispatchBody.dispatch.id);
  });

  it("rejects dispatch confirmation until server-recorded availability exists", async () => {
    mockUser.value = STAFF2;
    const id = await sentIncident("amb-no-availability-1");
    const response = await ambulance(
      jsonRequest("http://localhost/a", "POST", {
        decision: "dispatch",
        idempotencyKey: "amb-no-availability-dispatch-1",
      }),
      ap(id),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/availability/i);
    const current = await getOne(new Request(`http://localhost/api/incidents/${id}`), ap(id));
    expect((await current.json()).incident.status).toBe("REQUEST_SENT");
  });

  it("denies regular users access to availability and dispatch decisions", async () => {
    mockUser.value = STAFF2;
    const id = await sentIncident("amb-owner-no-dispatch-1");
    mockUser.value = OWNER;
    const response = await ambulance(
      jsonRequest("http://localhost/a", "POST", {
        decision: "available",
        idempotencyKey: "amb-owner-availability-1",
      }),
      ap(id),
    );
    expect(response.status).toBe(403);
  });

  it("confirms an ambulance from REQUEST_STARTED and advances to dispatched", async () => {
    mockUser.value = STAFF2;
    const created = await create(
      jsonRequest("http://localhost/api/incidents", "POST", {
        affectsSelf: true,
        emergencyType: "Fresh report confirm",
        idempotencyKey: "amb-fresh-1",
      }),
    );
    const { incident } = (await created.json()) as { incident: { id: string; status: string } };
    expect(incident.status).toBe("REQUEST_STARTED");
    const res = await ambulance(
      jsonRequest("http://localhost/a", "POST", {
        decision: "confirm",
        vehicle: "Ambulance A1",
        idempotencyKey: "amb-fresh-key-1",
      }),
      ap(incident.id),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      dispatch: { state: string; simulated: boolean; targetName: string };
      incident: { status: string };
    };
    expect(body.dispatch.state).toBe("ACCEPTED");
    expect(body.dispatch.simulated).toBe(false);
    expect(body.incident.status).toBe("DISPATCHED_ACCEPTED");
  });

  it("rejects confirmation before the incident is sent", async () => {
    mockUser.value = STAFF2;
    const created = await create(
      jsonRequest("http://localhost/api/incidents", "POST", {
        affectsSelf: true,
        emergencyType: "Too early",
        idempotencyKey: "amb-early-1",
      }),
    );
    const { incident } = (await created.json()) as { incident: { id: string } };
    const res = await ambulance(
      jsonRequest("http://localhost/a", "POST", {
        decision: "confirm",
        idempotencyKey: "amb-early-key-1",
      }),
      ap(incident.id),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { incident: { status: string } };
    expect(body.incident.status).toBe("DISPATCHED_ACCEPTED");
  });

  it("rejects anonymous dispatch decisions with 401", async () => {
    mockUser.value = null;
    const res = await ambulance(
      jsonRequest("http://localhost/a", "POST", {
        decision: "confirm",
        idempotencyKey: "amb-anon-1",
      }),
      ap("whatever"),
    );
    expect(res.status).toBe(401);
  });

  it("lets owners see their own dispatch states", async () => {
    mockUser.value = OWNER;
    const created = await create(
      jsonRequest("http://localhost/api/incidents", "POST", {
        affectsSelf: true,
        emergencyType: "Owner visibility probe",
        idempotencyKey: "amb-owner-1",
      }),
    );
    const { incident } = (await created.json()) as { incident: { id: string } };
    const id = incident.id;
    mockUser.value = STAFF2;
    await setStatus(
      jsonRequest("http://localhost/s", "POST", {
        to: "REQUEST_SENT",
        idempotencyKey: "amb-owner-1-ev",
      }),
      ap(id),
    );
    await ambulance(
      jsonRequest("http://localhost/a", "POST", {
        decision: "decline",
        idempotencyKey: "amb-owner-key-1",
      }),
      ap(id),
    );
    mockUser.value = OWNER;
    const res = await listDispatches(
      new Request(`http://localhost/api/incidents/${id}/dispatch`),
      ap(id),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { dispatches: { state: string }[] };
    expect(body.dispatches.some((d) => d.state === "DECLINED")).toBe(true);
  });
});

vi.mock("@/lib/integrations/whatsapp", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/integrations/whatsapp")>();
  return {
    ...original,
    sendTemplateMessage: vi.fn(),
  };
});

vi.mock("@/lib/integrations/daily", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/integrations/daily")>();
  return {
    ...original,
    getOrCreateRoom: vi.fn(),
    issueMeetingToken: vi.fn(),
  };
});

describe("responders roster (staff-only, fictional data)", () => {
  const get = (url: string) => new Request(url);

  it("rejects anonymous roster reads with 401", async () => {
    mockUser.value = null;
    const res = await roster(get("http://localhost/api/responders"));
    expect(res.status).toBe(401);
  });

  it("rejects non-staff roster reads with 403", async () => {
    mockUser.value = OTHER;
    const res = await roster(get("http://localhost/api/responders"));
    expect(res.status).toBe(403);
  });

  it("serves the fictional roster to staff without real contact details", async () => {
    mockUser.value = STAFF;
    const res = await roster(get("http://localhost/api/responders"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { responders: Record<string, unknown>[] };
    expect(body.responders.length).toBeGreaterThan(0);
    expect(body.responders.every((r) => typeof r["email"] === "string")).toBe(true);
    expect(JSON.stringify(body.responders)).not.toMatch(/\+[0-9]/);
  });
});

describe("WhatsApp notifications (truthful states, scoped recipients)", () => {
  const p = (id: string) => ({ params: Promise.resolve({ id }) });

  async function ownedIncidentWithContact(key: string): Promise<{ id: string; contactId: string }> {
    mockUser.value = OWNER;
    const created = await create(
      jsonRequest("http://localhost/api/incidents", "POST", {
        affectsSelf: true,
        emergencyType: "WhatsApp probe",
        idempotencyKey: key,
      }),
    );
    const { incident } = (await created.json()) as { incident: { id: string } };
    const { coordinationStore } = await import("@/lib/coordination-store");
    const contact = await coordinationStore.addContact(incident.id, {
      name: "Ama",
      channel: "SMS",
      address: "+2348012345678",
      consent: true,
    });
    return { id: incident.id, contactId: contact.id };
  }

  it("rejects anonymous sends without revealing the incident (404 mask)", async () => {
    mockUser.value = null;
    const created = await create(
      jsonRequest("http://localhost/api/incidents", "POST", {
        affectsSelf: true,
        emergencyType: "Anonymous notify probe",
        idempotencyKey: "wa-anon-inc-1",
      }),
    );
    const { incident } = (await created.json()) as { incident: { id: string } };
    const res = await notifyWhatsapp(
      jsonRequest("http://localhost/w", "POST", { contactId: "x", idempotencyKey: "wa-anon-1" }),
      p(incident.id),
    );
    expect(res.status).toBe(404);
  });

  it("rejects contacts from other incidents with 404", async () => {
    mockUser.value = OWNER;
    const { id } = await ownedIncidentWithContact("wa-foreign-1");
    const res = await notifyWhatsapp(
      jsonRequest("http://localhost/w", "POST", {
        contactId: "someone-elses-contact",
        idempotencyKey: "wa-foreign-key-1",
      }),
      p(id),
    );
    expect(res.status).toBe(404);
  });

  it("records FAILED honestly when the provider is unconfigured", async () => {
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "");
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "");
    mockUser.value = OWNER;
    const { id, contactId } = await ownedIncidentWithContact("wa-unconf-1");
    const res = await notifyWhatsapp(
      jsonRequest("http://localhost/w", "POST", { contactId, idempotencyKey: "wa-unconf-key-1" }),
      p(id),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      notification: { state: string; provider: string };
      error: string;
    };
    expect(body.notification.state).toBe("FAILED");
    expect(body.notification.provider).toBe("whatsapp");
    expect(body.error).toMatch(/not configured/i);
    vi.unstubAllEnvs();
  });

  it("records SENT on provider success and dedupes repeats", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123456789");
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "test-token");
    const { sendTemplateMessage } = await import("@/lib/integrations/whatsapp");
    vi.mocked(sendTemplateMessage).mockResolvedValueOnce({ providerMessageId: "wamid.xyz" });
    mockUser.value = OWNER;
    const { id, contactId } = await ownedIncidentWithContact("wa-sent-1");
    const payload = { contactId, idempotencyKey: "wa-sent-key-1" };
    const first = await notifyWhatsapp(jsonRequest("http://localhost/w", "POST", payload), p(id));
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as { notification: { state: string } };
    expect(firstBody.notification.state).toBe("SENT");
    const second = await notifyWhatsapp(jsonRequest("http://localhost/w", "POST", payload), p(id));
    const secondBody = (await second.json()) as { notification: { id: string } };
    expect(secondBody.notification.id).toBeDefined();
    expect(vi.mocked(sendTemplateMessage)).toHaveBeenCalledTimes(1);
    vi.unstubAllEnvs();
  });

  it("records FAILED on provider failure with a 502", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123456789");
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "test-token");
    const { sendTemplateMessage } = await import("@/lib/integrations/whatsapp");
    const { WhatsAppError } = await import("@/lib/integrations/whatsapp");
    vi.mocked(sendTemplateMessage).mockRejectedValueOnce(new WhatsAppError(422, "rejected"));
    mockUser.value = OWNER;
    const { id, contactId } = await ownedIncidentWithContact("wa-fail-1");
    const res = await notifyWhatsapp(
      jsonRequest("http://localhost/w", "POST", { contactId, idempotencyKey: "wa-fail-key-1" }),
      p(id),
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { notification: { state: string } };
    expect(body.notification.state).toBe("FAILED");
    vi.unstubAllEnvs();
  });
});

describe("video call access (scoped tokens, honest states)", () => {
  const p = (id: string) => ({ params: Promise.resolve({ id }) });

  async function ownedIncident(key: string): Promise<string> {
    mockUser.value = OWNER;
    const created = await create(
      jsonRequest("http://localhost/api/incidents", "POST", {
        affectsSelf: true,
        emergencyType: "Call probe",
        idempotencyKey: key,
      }),
    );
    const { incident } = (await created.json()) as { incident: { id: string } };
    return incident.id;
  }

  it("reports unconfigured without credentials or network", async () => {
    vi.stubEnv("DAILY_API_KEY", "");
    mockUser.value = OWNER;
    const id = await ownedIncident("call-unconf-1");
    const res = await createCall(
      jsonRequest("http://localhost/c", "POST", { idempotencyKey: "call-unconf-key-1" }),
      p(id),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { configured: boolean };
    expect(body.configured).toBe(false);
    vi.unstubAllEnvs();
  });

  it("keeps Daily disabled in demo mode even when a key is present", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    vi.stubEnv("DAILY_API_KEY", "test-key");
    mockUser.value = OWNER;
    const id = await ownedIncident("call-demo-mode-1");
    const res = await createCall(
      jsonRequest("http://localhost/c", "POST", { idempotencyKey: "call-demo-mode-key-1" }),
      p(id),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      configured: false,
      message: "Live calls are disabled in this demo.",
    });
    vi.unstubAllEnvs();
  });

  it("lets anonymous link-holders reach room creation but issues no tokens unconfigured", async () => {
    mockUser.value = null;
    const created = await create(
      jsonRequest("http://localhost/api/incidents", "POST", {
        affectsSelf: true,
        emergencyType: "Anonymous call probe",
        idempotencyKey: "call-anon-inc-1",
      }),
    );
    const { incident } = (await created.json()) as { incident: { id: string } };
    const res = await createCall(
      jsonRequest("http://localhost/c", "POST", { idempotencyKey: "call-anon-1" }),
      p(incident.id),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      configured: boolean;
      url?: string;
      token?: string;
    };
    expect(body.configured).toBe(false);
    expect(body.url).toBeUndefined();
    expect(body.token).toBeUndefined();
  });

  it("denies doctor join to non-medical roles", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("DAILY_API_KEY", "test-key");
    mockUser.value = OWNER;
    const id = await ownedIncident("call-deny-1");
    const res = await joinCall(
      jsonRequest("http://localhost/j", "POST", { as: "doctor" }),
      p(id),
    );
    expect(res.status).toBe(403);
    vi.unstubAllEnvs();
  });

  it("issues scoped tokens to owner-patient and medical doctor", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("DAILY_API_KEY", "test-key");
    const { getOrCreateRoom, issueMeetingToken } = await import("@/lib/integrations/daily");
    vi.mocked(getOrCreateRoom).mockResolvedValue({ name: "emergency-x", url: "https://x.daily.co/emergency-x" });
    vi.mocked(issueMeetingToken).mockResolvedValue({ token: "tok-test" });
    mockUser.value = OWNER;
    const id = await ownedIncident("call-ok-1");
    const patientJoin = await joinCall(
      jsonRequest("http://localhost/j", "POST", { as: "patient" }),
      p(id),
    );
    expect(patientJoin.status).toBe(200);
    const patientBody = (await patientJoin.json()) as { url: string; token: string; as: string };
    expect(patientBody.as).toBe("patient");
    expect(patientBody.token).toBe("tok-test");
    expect(JSON.stringify(patientBody)).not.toContain("test-key");

    mockUser.value = STAFF;
    const doctorJoin = await joinCall(
      jsonRequest("http://localhost/j", "POST", { as: "doctor" }),
      p(id),
    );
    expect(doctorJoin.status).toBe(200);
    vi.unstubAllEnvs();
  });

  it("rejects unauthenticated doctor join with 401", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("DAILY_API_KEY", "test-key");
    mockUser.value = null;
    const created = await create(
      jsonRequest("http://localhost/api/incidents", "POST", {
        affectsSelf: true,
        emergencyType: "Unauthenticated join probe",
        idempotencyKey: "call-unauth-inc-1",
      }),
    );
    const { incident } = (await created.json()) as { incident: { id: string } };
    const res = await joinCall(
      jsonRequest("http://localhost/j", "POST", { as: "doctor" }),
      p(incident.id),
    );
    expect(res.status).toBe(401);
    vi.unstubAllEnvs();
  });

  it("masks owned incidents from anonymous patient join as 404", async () => {
    vi.stubEnv("DAILY_API_KEY", "test-key");
    mockUser.value = OWNER;
    const id = await ownedIncident("call-anonpatient-1");
    mockUser.value = null;
    const res = await joinCall(
      jsonRequest("http://localhost/j", "POST", { as: "patient" }),
      p(id),
    );
    expect(res.status).toBe(404);
    vi.unstubAllEnvs();
  });

  it("denies patient join to signed-in non-owners with 404", async () => {
    vi.stubEnv("DAILY_API_KEY", "test-key");
    mockUser.value = OWNER;
    const id = await ownedIncident("call-nonowner-1");
    mockUser.value = OTHER;
    const res = await joinCall(
      jsonRequest("http://localhost/j", "POST", { as: "patient" }),
      p(id),
    );
    expect(res.status).toBe(404);
    vi.unstubAllEnvs();
  });

  it("denies doctor join to responder role with 403", async () => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("DAILY_API_KEY", "test-key");
    mockUser.value = OWNER;
    const id = await ownedIncident("call-respdeny-1");
    mockUser.value = {
      id: "resp-2",
      email: "responder2@example.com",
      role: "RESPONDER",
      facilityId: null,
    };
    const res = await joinCall(
      jsonRequest("http://localhost/j", "POST", { as: "doctor" }),
      p(id),
    );
    expect(res.status).toBe(403);
    vi.unstubAllEnvs();
  });

  it("returns 404 for doctor join on unknown incidents", async () => {
    vi.stubEnv("DAILY_API_KEY", "test-key");
    mockUser.value = {
      id: "med-9",
      email: "med9@example.com",
      role: "MEDICAL_PROFESSIONAL",
      facilityId: null,
    };
    const res = await joinCall(
      jsonRequest("http://localhost/j", "POST", { as: "doctor" }),
      p("no-such-incident"),
    );
    expect(res.status).toBe(404);
    vi.unstubAllEnvs();
  });
});
