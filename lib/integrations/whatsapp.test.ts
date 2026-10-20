import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WhatsAppError,
  isWhatsAppConfigured,
  sendTemplateMessage,
  whatsappConfig,
} from "./whatsapp";

afterEach(() => {
  vi.unstubAllEnvs();
});

function withCreds() {
  vi.stubEnv("DEMO_MODE", "false");
  vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123456789");
  vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "test-token");
}

describe("WhatsApp adapter (server-only, template-only)", () => {
  it("reports unconfigured without credentials", () => {
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "");
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "");
    expect(isWhatsAppConfigured()).toBe(false);
    expect(whatsappConfig()).toBeNull();
  });

  it("refuses to send when unconfigured, without touching the network", async () => {
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "");
    const calls: unknown[] = [];
    const spy = async (...args: unknown[]) => {
      calls.push(args);
      return new Response("{}", { status: 200 });
    };
    await expect(
      sendTemplateMessage(
        { to: "2348012345678", template: "emergency_alert", language: "en", parameters: [] },
        spy as typeof fetch,
      ),
    ).rejects.toThrow(WhatsAppError);
    expect(calls).toHaveLength(0);
  });

  it("sends a template message and returns the provider id", async () => {
    withCreds();
    let url = "";
    let auth = "";
    let body: Record<string, unknown> = {};
    const spy = async (u: unknown, init?: { headers?: Record<string, string>; body?: string }) => {
      url = String(u);
      auth = init?.headers?.["Authorization"] ?? "";
      body = JSON.parse(init?.body ?? "{}") as Record<string, unknown>;
      return new Response(JSON.stringify({ messages: [{ id: "wamid.abc" }] }), { status: 200 });
    };
    const result = await sendTemplateMessage(
      { to: "2348012345678", template: "emergency_alert", language: "en", parameters: ["ref-1", "sent"] },
      spy as typeof fetch,
    );
    expect(result.providerMessageId).toBe("wamid.abc");
    expect(url).toContain("/123456789/messages");
    expect(auth).toBe("Bearer test-token");
    expect(body["type"]).toBe("template");
    expect((body["template"] as { name: string }).name).toBe("emergency_alert");
  });

  it("maps provider rejections and network failures to safe errors", async () => {
    withCreds();
    const bad = async () => new Response("bad", { status: 400 });
    await expect(
      sendTemplateMessage(
        { to: "2348012345678", template: "t", language: "en", parameters: [] },
        bad as typeof fetch,
      ),
    ).rejects.toMatchObject({ name: "WhatsAppError", status: 422 });
    const down = async () => {
      throw new Error("socket hang up");
    };
    await expect(
      sendTemplateMessage(
        { to: "2348012345678", template: "t", language: "en", parameters: [] },
        down as typeof fetch,
      ),
    ).rejects.toMatchObject({ name: "WhatsAppError", status: 502 });
  });

  it("rejects responses without a message id", async () => {
    withCreds();
    const empty = async () =>
      new Response(JSON.stringify({ messages: [] }), { status: 200 });
    await expect(
      sendTemplateMessage(
        { to: "2348012345678", template: "t", language: "en", parameters: [] },
        empty as typeof fetch,
      ),
    ).rejects.toThrow(WhatsAppError);
  });

  it("stays inert in demo mode despite credentials, without network calls", async () => {
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123456789");
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "test-token");
    expect(isWhatsAppConfigured()).toBe(false);
    const calls: unknown[] = [];
    const spy = async (...args: unknown[]) => {
      calls.push(args);
      return new Response("{}", { status: 200 });
    };
    await expect(
      sendTemplateMessage(
        { to: "2348012345678", template: "t", language: "en", parameters: [] },
        spy as typeof fetch,
      ),
    ).rejects.toThrow(WhatsAppError);
    expect(calls).toHaveLength(0);
  });

  it("reenables with explicit production mode", () => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123456789");
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "test-token");
    expect(isWhatsAppConfigured()).toBe(true);
  });
});
