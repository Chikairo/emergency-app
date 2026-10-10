import { describe, expect, it } from "vitest";
import { GET as health } from "@/app/api/health/route";
import { POST as create } from "@/app/api/incidents/route";
import { GET as getOne } from "@/app/api/incidents/[id]/route";
import { PATCH as setLocation } from "@/app/api/incidents/[id]/location/route";
import { POST as setStatus } from "@/app/api/incidents/[id]/status/route";
import { GET as guidance } from "@/app/api/guidance/route";

function jsonRequest(url: string, method: string, body: unknown): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

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
