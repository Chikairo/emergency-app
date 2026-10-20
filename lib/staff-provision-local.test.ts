import { describe, expect, it } from "vitest";
import {
  getLocalDevelopmentTrustedOrigins,
  isDevelopmentStaffSetupEnabled,
  isLocalDatabaseUrl,
  isLoopbackHostname,
} from "./staff-provision";

describe("local development staff setup guard", () => {
  it("trusts only the exact same-origin loopback request in local development", () => {
    const localDatabase = "postgresql://localhost:55432/emergency";
    const sameOrigin = new Request("http://localhost:3000/api/auth/sign-up/email", {
      headers: { origin: "http://localhost:3000" },
    });

    expect(
      getLocalDevelopmentTrustedOrigins(sameOrigin, "development", localDatabase),
    ).toEqual(["http://localhost:3000"]);
    expect(
      getLocalDevelopmentTrustedOrigins(sameOrigin, "production", localDatabase),
    ).toEqual([]);
    expect(
      getLocalDevelopmentTrustedOrigins(
        sameOrigin,
        "development",
        "postgresql://remote.example.test:5432/emergency",
      ),
    ).toEqual([]);
  });

  it("does not trust a mismatched or non-loopback origin", () => {
    const localDatabase = "postgresql://localhost:55432/emergency";
    const mismatchedPort = new Request("http://localhost:3000/api/auth/sign-up/email", {
      headers: { origin: "http://localhost:3001" },
    });
    const remoteOrigin = new Request("http://localhost:3000/api/auth/sign-up/email", {
      headers: { origin: "https://example.test" },
    });

    expect(
      getLocalDevelopmentTrustedOrigins(mismatchedPort, "development", localDatabase),
    ).toEqual([]);
    expect(
      getLocalDevelopmentTrustedOrigins(remoteOrigin, "development", localDatabase),
    ).toEqual([]);
  });

  it("accepts PostgreSQL URLs only when their hostname is exactly loopback", () => {
    expect(isLocalDatabaseUrl("postgresql://dev:dev@localhost:5432/emergency")).toBe(true);
    expect(isLocalDatabaseUrl("postgres://dev:dev@127.0.0.1:5432/emergency")).toBe(true);
    expect(isLocalDatabaseUrl("postgresql://dev:dev@[::1]:5432/emergency")).toBe(true);
    expect(isLocalDatabaseUrl("postgresql://dev:dev@localhost.example.test:5432/db")).toBe(false);
    expect(isLocalDatabaseUrl("postgresql://dev:dev@remote.example.test:5432/db")).toBe(false);
    expect(isLocalDatabaseUrl("file://localhost/emergency.db")).toBe(false);
    expect(isLocalDatabaseUrl(undefined)).toBe(false);
  });

  it("enables web setup only in development with a loopback database", () => {
    const local = "postgresql://dev:dev@localhost:5432/emergency";
    expect(isDevelopmentStaffSetupEnabled("development", local)).toBe(true);
    expect(isDevelopmentStaffSetupEnabled("production", local)).toBe(false);
    expect(isDevelopmentStaffSetupEnabled("test", local)).toBe(false);
    expect(
      isDevelopmentStaffSetupEnabled(
        "development",
        "postgresql://dev:dev@remote.example.test:5432/emergency",
      ),
    ).toBe(false);
  });

  it("identifies loopback hostnames exactly", () => {
    expect(isLoopbackHostname("localhost")).toBe(true);
    expect(isLoopbackHostname("127.0.0.1")).toBe(true);
    expect(isLoopbackHostname("[::1]")).toBe(true);
    expect(isLoopbackHostname("localhost.example.test")).toBe(false);
    expect(isLoopbackHostname("192.168.1.12")).toBe(false);
  });
});
