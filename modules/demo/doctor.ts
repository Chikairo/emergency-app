// Doctor contact helpers. The private number lives only in the server-side
// DOCTOR_WHATSAPP_NUMBER environment variable and is never hardcoded,
// logged, or bundled into client JavaScript.

/** Normalize a configured number to digits-only E.164 without "+". */
export function normalizeWhatsAppNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  // E.164 numbers are 7-15 digits; anything else is a misconfiguration.
  if (digits.length < 7 || digits.length > 15) return null;
  return digits;
}

/** Build a click-to-chat URL. Returns null when unconfigured/invalid. */
export function whatsAppChatUrl(raw: string | undefined, text: string): string | null {
  if (!raw) return null;
  const digits = normalizeWhatsAppNumber(raw);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export const DEMO_WHATSAPP_TEXT =
  "Hello, this is a controlled Emergency Care demo test. No real emergency.";
