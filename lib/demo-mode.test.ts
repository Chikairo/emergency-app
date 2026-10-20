import { afterEach, describe, expect, it, vi } from "vitest";
import { isDemoMode } from "./demo-mode";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("demo kill-switch (server-only, default-safe)", () => {
  it("is ON by default and for any non-false value", () => {
    expect(isDemoMode()).toBe(true);
    vi.stubEnv("DEMO_MODE", "true");
    expect(isDemoMode()).toBe(true);
    vi.stubEnv("DEMO_MODE", "");
    expect(isDemoMode()).toBe(true);
  });

  it("turns OFF only with an explicit false", () => {
    vi.stubEnv("DEMO_MODE", "false");
    expect(isDemoMode()).toBe(false);
  });
});
