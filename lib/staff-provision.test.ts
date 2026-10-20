import { describe, expect, it } from "vitest";
import { ELEVABLE_ROLES, isLocalDatabaseUrl, parsePromoteArgs } from "./staff-provision";

describe("staff provisioning guards (pure, no I/O)", () => {
  it("never elevates to public roles", () => {
    expect(ELEVABLE_ROLES).not.toContain("BYSTANDER");
    expect(ELEVABLE_ROLES).not.toContain("PATIENT");
  });

  it("parses and normalizes valid elevation requests", () => {
    expect(parsePromoteArgs(["dispatcher@example.com", "dispatcher"])).toEqual({
      email: "dispatcher@example.com",
      role: "DISPATCHER",
    });
  });

  it("rejects missing args, bad roles, and malformed input", () => {
    expect(() => parsePromoteArgs([])).toThrow(/usage/i);
    expect(() => parsePromoteArgs(["a@x.com"])).toThrow(/usage/i);
    expect(() => parsePromoteArgs(["a@x.com", "BYSTANDER"])).toThrow(/one of/i);
    expect(() => parsePromoteArgs(["a@x.com", "SUPERUSER"])).toThrow(/one of/i);
  });

  it("accepts only loopback database URLs", () => {
    expect(isLocalDatabaseUrl("postgresql://u:p@localhost:5432/db?schema=public")).toBe(true);
    expect(isLocalDatabaseUrl("postgresql://u:p@127.0.0.1:5432/db")).toBe(true);
    expect(isLocalDatabaseUrl(undefined)).toBe(false);
    expect(isLocalDatabaseUrl("")).toBe(false);
    expect(isLocalDatabaseUrl("postgresql://u:p@staging.example.com:5432/db")).toBe(false);
    expect(isLocalDatabaseUrl("postgresql://u:p@neon.tech:5432/db")).toBe(false);
  });
});
