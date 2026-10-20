import { describe, expect, it, vi } from "vitest";
import { POST as launch } from "@/app/api/demo/route";
import { GET as view } from "@/app/api/demo/[id]/route";
import { POST as act } from "@/app/api/demo/[id]/action/route";
import { GET as doctorLink } from "@/app/api/demo/[id]/doctor-link/route";

function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function get(url: string): Request {
  return new Request(url);
}

describe("demo API (role-separated, idempotent)", () => {
  it("launches a session with separate patient and agency URLs", async () => {
    const res = await launch(
      jsonRequest("http://localhost/api/demo", "POST", {
        destination: "demo-hospital-ikeja",
        idempotencyKey: `api-demo-${Math.random().toString(36).slice(2)}`,
      }),
    );
    expect(res.status).toBe(201);
    const { demo } = (await res.json()) as {
      demo: { id: string; patientUrl: string; agencyUrl: string };
    };
    expect(demo.patientUrl).toContain(`/demo/${demo.id}/patient?token=`);
    expect(demo.agencyUrl).toContain(`/demo/${demo.id}/agency?token=`);
    expect(demo.patientUrl).not.toContain("agency");
  });

  it("serves role-filtered views and hides unknown tokens as 404", async () => {
    const launched = await launch(
      jsonRequest("http://localhost/api/demo", "POST", {
        destination: "demo-clinic-surulere",
        idempotencyKey: `api-demo-${Math.random().toString(36).slice(2)}`,
      }),
    );
    const { demo } = (await launched.json()) as {
      demo: { id: string; patientUrl: string; agencyUrl: string };
    };
    const patientToken = new URL(`http://x${demo.patientUrl}`).searchParams.get("token") ?? "";
    const agencyToken = new URL(`http://x${demo.agencyUrl}`).searchParams.get("token") ?? "";

    const patientView = await view(get(`http://localhost/api/demo/${demo.id}?token=${patientToken}`), {
      params: Promise.resolve({ id: demo.id }),
    });
    expect(patientView.status).toBe(200);
    const patientBody = (await patientView.json()) as { demo: Record<string, unknown> };
    expect(patientBody.demo["role"]).toBe("patient");
    expect("agencyToken" in patientBody.demo).toBe(false);
    expect("patientToken" in patientBody.demo).toBe(false);

    const wrong = await view(get(`http://localhost/api/demo/${demo.id}?token=nope-12345678`), {
      params: Promise.resolve({ id: demo.id }),
    });
    expect(wrong.status).toBe(404);

    // Agency approves; patient sees the synchronized update.
    const approved = await act(
      jsonRequest("http://localhost/a", "POST", {
        action: "approve",
        token: agencyToken,
        idempotencyKey: `api-approve-${Math.random().toString(36).slice(2)}`,
      }),
      { params: Promise.resolve({ id: demo.id }) },
    );
    expect(approved.status).toBe(200);

    const synced = await view(get(`http://localhost/api/demo/${demo.id}?token=${patientToken}`), {
      params: Promise.resolve({ id: demo.id }),
    });
    const syncedBody = (await synced.json()) as { demo: { status: string } };
    expect(syncedBody.demo.status).toBe("EN_ROUTE");

    // Patient cannot perform agency actions.
    const denied = await act(
      jsonRequest("http://localhost/a", "POST", {
        action: "arrive",
        token: patientToken,
        idempotencyKey: `api-deny-${Math.random().toString(36).slice(2)}`,
      }),
      { params: Promise.resolve({ id: demo.id }) },
    );
    expect(denied.status).toBe(403);
  });

  it("reports doctor contact as unconfigured without a number", async () => {
    vi.stubEnv("DOCTOR_WHATSAPP_NUMBER", "");
    const launched = await launch(
      jsonRequest("http://localhost/api/demo", "POST", {
        destination: "demo-centre-yaba",
        idempotencyKey: `api-demo-${Math.random().toString(36).slice(2)}`,
      }),
    );
    const { demo } = (await launched.json()) as { demo: { id: string; patientUrl: string } };
    const token = new URL(`http://x${demo.patientUrl}`).searchParams.get("token") ?? "";
    const res = await doctorLink(get(`http://localhost/api/demo/${demo.id}/doctor-link?token=${token}`), {
      params: Promise.resolve({ id: demo.id }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { configured: boolean };
    expect(body.configured).toBe(false);
    vi.unstubAllEnvs();
  });

  it("rejects demo actions with unknown or malformed tokens", async () => {
    const launched = await launch(
      jsonRequest("http://localhost/api/demo", "POST", {
        destination: "demo-hospital-ikeja",
        idempotencyKey: `api-demo-${Math.random().toString(36).slice(2)}`,
      }),
    );
    const { demo } = (await launched.json()) as { demo: { id: string } };
    const params = { params: Promise.resolve({ id: demo.id }) };
    const attempt = (token: string) =>
      act(
        jsonRequest("http://localhost/a", "POST", {
          action: "approve",
          token,
          idempotencyKey: `api-badtoken-${Math.random().toString(36).slice(2)}`,
        }),
        params,
      );
    expect((await attempt("wrong-token-12345678")).status).toBe(403);
    expect((await attempt("short")).status).toBe(400);
  });
});
