import { audit } from "@/lib/audit";
import { DISPATCH_ROLES, requireRoles } from "@/lib/authz";
import { coordinationStore } from "@/lib/coordination-store";
import { getUser, scopedIncident, toErrorResponse } from "../../../_lib";

// Dispatcher acknowledgement on behalf of the assigned responder. Explicitly
// separate from responder self-acknowledgement (`ack`), which requires the
// RESPONDER role and an email match. Dispatchers manage coordination; they
// never impersonate the responder through the self-ack endpoint.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ aid: string }> },
) {
  try {
    const user = requireRoles(await getUser(request), DISPATCH_ROLES);
    const { aid } = await params;
    const existing = await coordinationStore.getAssignment(aid);
    if (!existing) {
      return Response.json({ error: `Assignment not found: ${aid}` }, { status: 404 });
    }
    await scopedIncident(request, existing.incidentId);
    const assignment = await coordinationStore.acknowledgeAssignment(aid);
    await audit({
      actorId: user.id,
      action: "responder.acknowledged",
      object: "assignment",
      objectId: aid,
      metadata: { incidentId: existing.incidentId, via: "dispatcher" },
    });
    return Response.json({ assignment });
  } catch (error) {
    return toErrorResponse(error);
  }
}
