import { ZodError } from "zod";
import { incidentStore } from "@/lib/incident-store";
import { canAccessIncident, ForbiddenRoleError, UnauthenticatedError } from "@/lib/authz";
import { getRequestUser, type RequestUser } from "@/lib/auth-session";

export function toErrorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json(
      { error: "Invalid input", issues: error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  if (error instanceof UnauthenticatedError) {
    return Response.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenRoleError) {
    return Response.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof Error && error.name === "InvalidTransitionError") {
    return Response.json({ error: error.message }, { status: 422 });
  }
  if (error instanceof Error && /not found/i.test(error.message)) {
    return Response.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof Error) {
    // Domain rule violations (bad state, unverified responder, etc.)
    return Response.json({ error: error.message }, { status: 422 });
  }
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}

export function getStore() {
  return incidentStore;
}

export function getUser(request: Request): Promise<RequestUser | null> {
  return getRequestUser(request);
}

/**
 * Owner/staff/link-scoped incident loader. Denials throw a "not found"
 * error so responses never confirm or deny a private record.
 */
export async function scopedIncident(request: Request, id: string) {
  const user = await getUser(request);
  const incident = await getStore().getIncident(id);
  if (!incident || !canAccessIncident(user, incident)) {
    throw new Error(`Incident not found: ${id}`);
  }
  return { user, incident };
}
