import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUser = vi.hoisted(() => ({
  value: null as null | { id: string; email: string; role: string; facilityId: string | null },
}));
const mockUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-session", () => ({
  getRequestUser: async () => mockUser.value,
}));
vi.mock("@/lib/db", () => ({
  db: { user: { update: mockUpdate } },
}));

import { POST } from "./route";

function makeRequest(origin = "http://localhost:3000"): Request {
  return new Request("http://localhost:3000/api/dev/staff-provision", {
    method: "POST",
    headers: { origin },
  });
}

describe("local staff provisioning route", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DATABASE_URL", "postgresql://dev:dev@localhost:5432/emergency");
    mockUser.value = null;
    mockUpdate.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is unavailable in production and for remote databases", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await POST(makeRequest())).status).toBe(404);

    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DATABASE_URL", "postgresql://user:password@remote.example.test:5432/db");
    expect((await POST(makeRequest())).status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("requires a same-origin loopback request and an authenticated account", async () => {
    expect((await POST(makeRequest("https://attacker.example"))).status).toBe(403);
    expect((await POST(makeRequest())).status).toBe(401);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("promotes only the authenticated local regular account to dispatcher", async () => {
    mockUser.value = {
      id: "local-user",
      email: "dispatcher@example.test",
      role: "BYSTANDER",
      facilityId: null,
    };

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ role: "DISPATCHER" });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "local-user" },
      data: { role: "DISPATCHER" },
    });
  });

  it("does not overwrite an existing staff role", async () => {
    mockUser.value = {
      id: "existing-staff",
      email: "medical@example.test",
      role: "MEDICAL_PROFESSIONAL",
      facilityId: null,
    };

    expect((await POST(makeRequest())).status).toBe(409);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
