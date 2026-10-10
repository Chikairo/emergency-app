import { audit } from "@/lib/audit";
import { DISPATCH_ROLES, requireRoles } from "@/lib/authz";
import { coordinationStore } from "@/lib/coordination-store";
import { getUser, scopedIncident, toErrorResponse } from "../../../_lib";

// Mock dispatch request: records SENT, never dispatched. Staff only.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = requireRoles(await getUser(request), DISPATCH_ROLES);
    await scopedIncident(request, id);
    const body: unknown = await request.json();
    const dispatch = await coordinationStore.requestDispatch(id, body);
    await audit({
      actorId: user.id,
      action: "dispatch.requested",
      object: "dispatch",
      objectId: dispatch.id,
      metadata: { incidentId: id },
    });
    return Response.json({ dispatch }, { status: 201 });
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
    requireRoles(await getUser(request), DISPATCH_ROLES);
    await scopedIncident(request, id);
    return Response.json({ dispatches: await coordinationStore.listDispatches(id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
