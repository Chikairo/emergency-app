import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DailyError,
  dailyConfig,
  getOrCreateRoom,
  isDailyConfigured,
  issueMeetingToken,
  roomNameForIncident,
} from "./daily";
import { isDemoMode } from "@/lib/demo-mode";
import { isWhatsAppConfigured } from "./whatsapp";

afterEach(() => {
  vi.unstubAllEnvs();
});

function withKey() {
  vi.stubEnv("DEMO_MODE", "false");
  vi.stubEnv("DAILY_API_KEY", "test-daily-key");
}

describe("Daily adapter (server-only, scoped tokens)", () => {
  it("reports unconfigured without an API key and never calls out", async () => {
    vi.stubEnv("DAILY_API_KEY", "");
    expect(isDailyConfigured()).toBe(false);
    expect(dailyConfig()).toBeNull();
    const calls: unknown[] = [];
    const spy = async (...args: unknown[]) => {
      calls.push(args);
      return new Response("{}", { status: 200 });
    };
    await expect(getOrCreateRoom("abc", spy as typeof fetch)).rejects.toThrow(DailyError);
    expect(calls).toHaveLength(0);
  });

  it("derives deterministic, safe room names per incident", () => {
    expect(roomNameForIncident("cmv123abc")).toBe("emergency-cmv123abc");
    expect(roomNameForIncident("cmv123abc")).toBe(roomNameForIncident("cmv123abc"));
    expect(roomNameForIncident("UPPER .. spaces")).toMatch(/^[a-z0-9-]+$/);
  });

  it("reuses an existing room instead of creating duplicates", async () => {
    withKey();
    const seen: string[] = [];
    const spy = async (url: unknown, init?: { method?: string }) => {
      seen.push(`${init?.method ?? "GET"} ${String(url)}`);
      return new Response(JSON.stringify({ name: "emergency-x", url: "https://x.daily.co/emergency-x" }), {
        status: 200,
      });
    };
    const room = await getOrCreateRoom("x", spy as typeof fetch);
    expect(room.url).toContain("daily.co");
    expect(seen.some((s) => s.startsWith("POST"))).toBe(false);
  });

  it("creates a private room when missing", async () => {
    withKey();
    const bodies: unknown[] = [];
    const spy = async (url: unknown, init?: { method?: string; body?: string }) => {
      if ((init?.method ?? "GET") === "GET") return new Response("nope", { status: 404 });
      bodies.push(JSON.parse(init?.body ?? "{}"));
      return new Response(JSON.stringify({ name: "emergency-y", url: "https://y.daily.co/emergency-y" }), {
        status: 200,
      });
    };
    const room = await getOrCreateRoom("y", spy as typeof fetch);
    expect(room.name).toBe("emergency-y");
    expect((bodies[0] as { privacy: string }).privacy).toBe("private");
  });

  it("issues participant-scoped tokens without leaking the API key", async () => {
    withKey();
    let auth = "";
    let body: Record<string, unknown> = {};
    const spy = async (url: unknown, init?: { headers?: Record<string, string>; body?: string }) => {
      auth = init?.headers?.["Authorization"] ?? "";
      body = JSON.parse(init?.body ?? "{}") as Record<string, unknown>;
      return new Response(JSON.stringify({ token: "tok-doc" }), { status: 200 });
    };
    const { token } = await issueMeetingToken("emergency-y", "doctor", "user-1", spy as typeof fetch);
    expect(token).toBe("tok-doc");
    expect(auth).toBe("Bearer test-daily-key");
    expect((body["properties"] as { is_owner: boolean }).is_owner).toBe(true);
  });

  it("maps provider outages to safe errors", async () => {
    withKey();
    const down = async () => {
      throw new Error("reset");
    };
    await expect(getOrCreateRoom("z", down as typeof fetch)).rejects.toMatchObject({
      name: "DailyError",
      status: 502,
    });
  });

  it("stays inert in demo mode despite credentials, without network calls", async () => {
    vi.stubEnv("DAILY_API_KEY", "test-daily-key");
    vi.stubEnv("DAILY_ENABLED", "");
    expect(isDailyConfigured()).toBe(false);
    const calls: unknown[] = [];
    const spy = async (...args: unknown[]) => {
      calls.push(args);
      return new Response("{}", { status: 200 });
    };
    await expect(getOrCreateRoom("demo-x", spy as typeof fetch)).rejects.toThrow(DailyError);
    await expect(
      issueMeetingToken("emergency-demo-x", "patient", "patient:demo-x", spy as typeof fetch),
    ).rejects.toThrow(DailyError);
    expect(calls).toHaveLength(0);
  });

  it("reenables with explicit production mode", () => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("DAILY_API_KEY", "test-daily-key");
    expect(isDailyConfigured()).toBe(true);
  });

  it("allows an explicit local Daily opt-in without enabling WhatsApp", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEMO_MODE", "true");
    vi.stubEnv("DAILY_ENABLED", "true");
    vi.stubEnv("DAILY_API_KEY", "test-daily-key");

    expect(isDailyConfigured()).toBe(true);
    expect(isDemoMode()).toBe(true);
    expect(isWhatsAppConfigured()).toBe(false);
  });
});
