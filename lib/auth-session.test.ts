import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRequestUser } from "./auth-session";

// Session boundary stub: production reads the Better Auth cookie.
const mockSession = vi.hoisted(() => ({
  getSession: vi.fn(async (): Promise<unknown> => null),
}));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: () => mockSession.getSession() } },
}));

beforeEach(() => {
  mockSession.getSession.mockReset().mockResolvedValue(null);
});

describe("session boundary (fail-closed, no I/O)", () => {
  it("returns null when signed out", async () => {
    expect(await getRequestUser(new Request("http://localhost/"))).toBeNull();
  });

  it("returns null when the auth store throws", async () => {
    // The boundary must degrade to anonymous, never throw.
    mockSession.getSession.mockRejectedValueOnce(new Error("store down"));
    expect(await getRequestUser(new Request("http://localhost/"))).toBeNull();
  });

  it("passes through id, email, role, and facilityId", async () => {
    mockSession.getSession.mockResolvedValueOnce({
      user: { id: "u1", email: "doc@example.com", role: "DISPATCHER", facilityId: "f1" },
    });
    expect(await getRequestUser(new Request("http://localhost/"))).toEqual({
      id: "u1",
      email: "doc@example.com",
      role: "DISPATCHER",
      facilityId: "f1",
    });
  });

  it("defaults missing roles to BYSTANDER, never staff", async () => {
    mockSession.getSession.mockResolvedValueOnce({ user: { id: "u2", email: "x@example.com" } });
    const user = await getRequestUser(new Request("http://localhost/"));
    expect(user?.role).toBe("BYSTANDER");
  });
});
