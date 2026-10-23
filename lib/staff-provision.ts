// Pure helpers for dev-only staff provisioning. No I/O here so the guards
// stay unit-testable; the script itself owns all writes.

/** Parse `dev-promote.ts <email>`; all explicitly provisioned staff are admins. */
export function parsePromoteArgs(argv: string[]): { email: string } {
  const [email, ...extraArgs] = argv;
  if (!email || extraArgs.length > 0) {
    throw new Error("Usage: tsx scripts/dev-promote.ts <email>");
  }
  return { email: email.trim() };
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
