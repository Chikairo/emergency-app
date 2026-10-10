import type { RequestUser } from "@/lib/auth-session";

// Pure RBAC helpers (no I/O): unit-testable without a database.
// Denials on incident-scoped resources map to "not found" at the route
// layer so failures never confirm or deny a private record's existence.

export const STAFF_ROLES = [
  "RESPONDER",
  "MEDICAL_PROFESSIONAL",
  "DISPATCHER",
  "HOSPITAL_ADMIN",
  "SYSTEM_ADMIN",
] as const;

export const DISPATCH_ROLES = ["DISPATCHER", "SYSTEM_ADMIN"] as const;
export const MEDPRO_ROLES = [
  "MEDICAL_PROFESSIONAL",
  "DISPATCHER",
  "SYSTEM_ADMIN",
] as const;
export const RESPONDER_ROLES = ["RESPONDER", "DISPATCHER", "SYSTEM_ADMIN"] as const;
export const OPS_ROLES = ["DISPATCHER", "SYSTEM_ADMIN"] as const;

export class UnauthenticatedError extends Error {
  constructor() {
    super("Sign-in required for this action.");
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenRoleError extends Error {
  constructor() {
    super("This action is not permitted for your role.");
    this.name = "ForbiddenRoleError";
  }
}

export function isStaff(role: string): boolean {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

/** Throws 401 when signed out, 403 when the role is not permitted. */
export function requireRoles(user: RequestUser | null, roles: readonly string[]): RequestUser {
  if (!user) throw new UnauthenticatedError();
  if (!roles.includes(user.role)) throw new ForbiddenRoleError();
  return user;
}

export interface ScopedIncident {
  reporter: string | null;
}

/**
 * Who may read or continue an incident:
 * - staff (any staff role),
 * - the signed-in reporter (owner),
 * - anyone holding the link when the report is anonymous (reporter unset),
 *   which keeps the no-login urgent flow working.
 * Anything else is denied (route maps to 404).
 */
export function canAccessIncident(
  user: RequestUser | null,
  incident: ScopedIncident,
): boolean {
  if (user && isStaff(user.role)) return true;
  if (user && incident.reporter && incident.reporter === user.id) return true;
  if (!user && !incident.reporter) return true;
  if (user && !incident.reporter) return true; // signed-in helper continuing a link-shared report
  return false;
}
