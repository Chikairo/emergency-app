import { audit } from "@/lib/audit";
import { RESPONDER_ROLES, DISPATCH_ROLES, requireRoles } from "@/lib/authz";
import { coordinationStore } from "@/lib/coordination-store";
import { assignmentCreateSchema } from "@/modules/coordination/validation";
import { getUser, scopedIncident, toErrorResponse } from "../../../_lib";

// Verified responders only — unverified volunteers are rejected (422).
// Assigning is dispatcher+; acknowledgement is responder+.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = requireRoles(await getUser(request), DISPATCH_ROLES);
    await scopedIncident(request, id);
    const body: unknown = await request.json();
    const assignment = await coordinationStore.assignResponder(
      id,
      assignmentCreateSchema.parse(body),
    );
    await audit({
      actorId: user.id,
      action: "responder.assigned",
      object: "assignment",
      objectId: assignment.id,
      metadata: { incidentId: id },
    });
    return Response.json({ assignment }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    requireRoles(await getUser(request), RESPONDER_ROLES);
    await scopedIncident(request, id);
    return Response.json({ assignments: await coordinationStore.listAssignments(id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
