import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sessionUser: null as null | { id: string; email: string; role: string; facilityId: string | null },
  actor: null as null | { role: string },
  target: null as null | { id: string; email: string; role: string },
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  getRequestUser: async () => mocks.sessionUser,
}));
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
      update: mocks.update,
    },
  },
}));
vi.mock("@/lib/audit", () => ({
  audit: mocks.audit,
}));

import { POST } from "./route";

function makeRequest(body: unknown = { email: "staff@example.test" }, origin = "https://app.example.test") {
  return new Request("https://app.example.test/api/admin/staff", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("admin staff access route", () => {
  beforeEach(() => {
    mocks.sessionUser = {
      id: "admin-id",
      email: "admin@example.test",
      role: "SYSTEM_ADMIN",
      facilityId: null,
    };
    mocks.actor = { role: "SYSTEM_ADMIN" };
    mocks.target = { id: "staff-id", email: "staff@example.test", role: "BYSTANDER" };
    mocks.findUnique.mockReset().mockImplementation(async () => mocks.actor);
    mocks.findFirst.mockReset().mockImplementation(async () => mocks.target);
    mocks.update.mockReset().mockResolvedValue({});
    mocks.audit.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requires a same-origin request and an authenticated user", async () => {
    expect((await POST(makeRequest(undefined, "https://attacker.example"))).status).toBe(403);
    mocks.sessionUser = null;
    expect((await POST(makeRequest())).status).toBe(401);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("checks the actor's current database role before granting access", async () => {
    mocks.actor = { role: "BYSTANDER" };
    expect((await POST(makeRequest())).status).toBe(403);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("promotes an existing account to system administrator and audits the action", async () => {
    const response = await POST(makeRequest({ email: " Staff@Example.Test " }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      email: "staff@example.test",
      role: "SYSTEM_ADMIN",
    });
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { email: { equals: "staff@example.test", mode: "insensitive" } },
      select: { id: true, email: true, role: true },
    });
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "staff-id" },
      data: { role: "SYSTEM_ADMIN" },
    });
    expect(mocks.audit).toHaveBeenCalledWith({
      actorId: "admin-id",
      action: "staff.promoted",
      object: "user",
      objectId: "staff-id",
      metadata: { email: "staff@example.test", role: "SYSTEM_ADMIN" },
    });
  });

  it("rejects invalid email and reports accounts that must register first", async () => {
    expect((await POST(makeRequest({ email: "not-an-email" }))).status).toBe(400);
    mocks.target = null;
    expect((await POST(makeRequest())).status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
