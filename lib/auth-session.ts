import { auth } from "@/lib/auth";

export interface RequestUser {
  id: string;
  email: string;
  role: string;
  facilityId: string | null;
}

// Single session boundary for all API routes. Tests stub this module with
// vi.mock; production reads the Better Auth session cookie. Returns null
// when signed out (anonymous urgent flows stay usable).
export async function getRequestUser(request: Request): Promise<RequestUser | null> {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return null;
    const u = session.user as unknown as Record<string, unknown>;
    return {
      id: String(u["id"] ?? ""),
      email: String(u["email"] ?? ""),
      role: String(u["role"] ?? "BYSTANDER"),
      facilityId: (u["facilityId"] as string | null) ?? null,
    };
  } catch {
    // No usable session (signed out, or auth store unreachable in dev).
    return null;
  }
}
