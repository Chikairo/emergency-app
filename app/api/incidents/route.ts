import { audit } from "@/lib/audit";
import { MEDICAL_READ_ROLES, requireRoles } from "@/lib/authz";
import { getStore, getUser, toErrorResponse } from "../_lib";

// Incident list for care and dispatch roles. Creation stays public below.
export async function GET(request: Request) {
  try {
    requireRoles(await getUser(request), MEDICAL_READ_ROLES);
    return Response.json({ incidents: await getStore().listIncidents() });
  } catch (error) {
    return toErrorResponse(error);
  }
}

// Public report creation (no login before urgent help). A signed-in
// reporter's id is attached so owner-scoped access applies later.
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const user = await getUser(request);
    const record = await getStore().createIncident(body, { reporter: user?.id ?? null });
    await audit({
      actorId: user?.id ?? null,
      action: "incident.created",
      object: "incident",
      objectId: record.id,
    });
    return Response.json({ incident: record }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
