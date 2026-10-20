import { audit } from "@/lib/audit";
import { ForbiddenRoleError, requireRoles } from "@/lib/authz";
import { coordinationStore } from "@/lib/coordination-store";
import { getUser, scopedIncident, toErrorResponse } from "../../../_lib";

// Strict responder self-acknowledgement: only a signed-in user with the
// RESPONDER role whose session email matches the assigned responder may
// acknowledge. Dispatchers use the separate dispatcher-ack endpoint.
// The request body is never trusted for identity.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ aid: string }> },
) {
  try {
    const user = requireRoles(await getUser(request), ["RESPONDER"]);
    const { aid } = await params;
    const existing = await coordinationStore.getAssignment(aid);
    if (!existing) {
      return Response.json({ error: `Assignment not found: ${aid}` }, { status: 404 });
    }
    await scopedIncident(request, existing.incidentId);
    const self = user.email.trim().toLowerCase();
    const assigned = existing.responderEmail.trim().toLowerCase();
    if (!self || self !== assigned) {
      throw new ForbiddenRoleError();
    }
    const assignment = await coordinationStore.acknowledgeAssignment(aid);
    await audit({
      actorId: user.id,
      action: "responder.acknowledged",
      object: "assignment",
      objectId: aid,
    });
    return Response.json({ assignment });
  } catch (error) {
    return toErrorResponse(error);
  }
}
