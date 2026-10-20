// Meta WhatsApp Cloud API adapter (server-only).
// Sends business-initiated notifications as pre-approved TEMPLATE messages
// only — freeform messages are never sent, keeping the integration inside
// Meta's template rules. Credentials stay server-side; errors never leak
// tokens, numbers, or message contents.
import { isDemoMode } from "@/lib/demo-mode";

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion: string;
  defaultTemplate: string;
  defaultLanguage: string;
}

export function whatsappConfig(): WhatsAppConfig | null {
  const phoneNumberId = process.env["WHATSAPP_PHONE_NUMBER_ID"]?.trim() ?? "";
  const accessToken = process.env["WHATSAPP_ACCESS_TOKEN"]?.trim() ?? "";
  if (!phoneNumberId || !accessToken) return null;
  return {
    phoneNumberId,
    accessToken,
    apiVersion: process.env["WHATSAPP_API_VERSION"]?.trim() || "v21.0",
    defaultTemplate: process.env["WHATSAPP_TEMPLATE_NAME"]?.trim() || "emergency_alert",
    defaultLanguage: process.env["WHATSAPP_TEMPLATE_LANGUAGE"]?.trim() || "en",
  };
}

export function isWhatsAppConfigured(): boolean {
  return !isDemoMode() && whatsappConfig() !== null;
}

export class WhatsAppError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "WhatsAppError";
    this.status = status;
  }
}

export interface TemplateSendInput {
  to: string; // digits, validated by callers
  template: string;
  language: string;
  parameters: string[];
  idempotencyKey?: string;
}

export interface TemplateSendResult {
  providerMessageId: string;
}

/** Send one template message. Throws WhatsAppError on any provider failure. */
export async function sendTemplateMessage(
  input: TemplateSendInput,
  fetchImpl: typeof fetch = fetch,
): Promise<TemplateSendResult> {
  const config = whatsappConfig();
  if (!config || isDemoMode()) {
    throw new WhatsAppError(503, "WhatsApp provider is not configured.");
  }
  let res: Response;
  try {
    res = await fetchImpl(
      `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: input.to,
          type: "template",
          template: {
            name: input.template,
            language: { code: input.language },
            components: [
              {
                type: "body",
                parameters: input.parameters.map((text) => ({ type: "text", text })),
              },
            ],
          },
        }),
        signal: AbortSignal.timeout(20_000),
      },
    );
  } catch {
    throw new WhatsAppError(502, "WhatsApp provider is unreachable.");
  }
  if (!res.ok) {
    throw new WhatsAppError(
      res.status >= 500 ? 502 : 422,
      "WhatsApp provider rejected the message.",
    );
  }
  const data = (await res.json().catch(() => null)) as {
    messages?: { id: string }[];
  } | null;
  const id = data?.messages?.[0]?.id;
  if (!id) {
    throw new WhatsAppError(502, "WhatsApp provider returned no message id.");
  }
  return { providerMessageId: id };
}
