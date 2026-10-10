import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { RequestUser } from "@/lib/auth-session";
// Server-component session reader. Returns null when signed out.
export async function getPageUser(): Promise<RequestUser | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return null;
    const u = session.user as unknown as Record<string, unknown>;
    return {
      id: String(u["id"] ?? ""),
      email: String(u["email"] ?? ""),
      role: String(u["role"] ?? "BYSTANDER"),
      facilityId: (u["facilityId"] as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export async function requirePageRoles(roles: readonly string[], signInPath = "/sign-in") {
  const user = await getPageUser();
  if (!user || !roles.includes(user.role)) redirect(signInPath);
  return user;
}
