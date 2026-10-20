// Pure helpers for the dev-only staff-promotion script. No I/O here so
// the guards stay unit-testable; the script itself owns all writes.

export const ELEVABLE_ROLES = [
  "RESPONDER",
  "MEDICAL_PROFESSIONAL",
  "DISPATCHER",
  "HOSPITAL_ADMIN",
  "SYSTEM_ADMIN",
] as const;

/** Parse `dev-promote.ts <email> <ROLE>`; throws a usage error otherwise. */
export function parsePromoteArgs(argv: string[]): { email: string; role: string } {
  const [email, role] = argv;
  if (!email || !role) {
    throw new Error("Usage: tsx scripts/dev-promote.ts <email> <ROLE>");
  }
  const normalizedRole = role.trim().toUpperCase();
  if (!(ELEVABLE_ROLES as readonly string[]).includes(normalizedRole)) {
    throw new Error(`Role must be one of: ${ELEVABLE_ROLES.join(", ")}`);
  }
  return { email: email.trim(), role: normalizedRole };
}

/** True only for loopback database URLs. Empty or remote URLs refuse. */
export function isLocalDatabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      ["postgres:", "postgresql:"].includes(parsed.protocol) &&
      isLoopbackHostname(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

export function isDevelopmentStaffSetupEnabled(
  nodeEnv: string | undefined,
  databaseUrl: string | undefined,
): boolean {
  return nodeEnv === "development" && isLocalDatabaseUrl(databaseUrl);
}

export function getLocalDevelopmentTrustedOrigins(
  request: Request | undefined,
  nodeEnv: string | undefined,
  databaseUrl: string | undefined,
): string[] {
  if (!request || !isDevelopmentStaffSetupEnabled(nodeEnv, databaseUrl)) return [];

  const origin = request.headers.get("origin");
  if (!origin) return [];

  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    if (
      origin !== originUrl.origin ||
      requestUrl.origin !== originUrl.origin ||
      !isLoopbackHostname(requestUrl.hostname) ||
      !isLoopbackHostname(originUrl.hostname)
    ) {
      return [];
    }

    return [originUrl.origin];
  } catch {
    return [];
  }
}
