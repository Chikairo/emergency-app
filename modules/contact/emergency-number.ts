// Emergency-number resolution for real phone-call handoff.
// A number is usable only when it is explicitly configured: placeholders
// such as mock or unspecified values must never become tappable tel: links.

export interface ResolvedEmergencyNumber {
  configured: boolean;
  /** Human-readable number, or null when unconfigured. */
  display: string | null;
  /** tel: href, or null when unconfigured. */
  telHref: string | null;
}

const PLACEHOLDER_PATTERN = /mock|unspecified|example|xxx|123456|000-?mock/i;

export function resolveEmergencyNumber(raw: string | undefined): ResolvedEmergencyNumber {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || PLACEHOLDER_PATTERN.test(trimmed)) {
    return { configured: false, display: null, telHref: null };
  }
  const digits = trimmed.replace(/[^\d]/g, "");
  // Emergency numbers are short service codes up to full E.164 lengths.
  if (digits.length < 2 || digits.length > 15) {
    return { configured: false, display: null, telHref: null };
  }
  const hasPlus = trimmed.startsWith("+");
  return {
    configured: true,
    display: hasPlus ? `+${digits}` : digits,
    telHref: `tel:${hasPlus ? "+" : ""}${digits}`,
  };
}
