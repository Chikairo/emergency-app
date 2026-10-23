import { describe, expect, it } from "vitest";
import { isLocalDatabaseUrl, parsePromoteArgs } from "./staff-provision";

describe("staff provisioning guards (pure, no I/O)", () => {
  it("sets all explicitly provisioned staff to system administrator", () => {
    expect(parsePromoteArgs(["staff@example.com"])).toEqual({
      email: "staff@example.com",
    });
  });

  it("rejects missing arguments and role overrides", () => {
    expect(() => parsePromoteArgs([])).toThrow(/usage/i);
    expect(() => parsePromoteArgs(["a@x.com", "DISPATCHER"])).toThrow(/usage/i);
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
