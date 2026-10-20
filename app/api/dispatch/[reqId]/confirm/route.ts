import { audit } from "@/lib/audit";
import { DISPATCH_ROLES, requireRoles } from "@/lib/authz";
import { coordinationStore } from "@/lib/coordination-store";
import { getUser, scopedIncident, toErrorResponse } from "../../../_lib";

// Dev-only mock dispatch confirmation. Response is flagged simulated.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ reqId: string }> },
) {
  try {
    const user = requireRoles(await getUser(request), DISPATCH_ROLES);
    const { reqId } = await params;
    const existing = await coordinationStore.getDispatch(reqId);
    if (!existing) {
      return Response.json({ error: `Dispatch request not found: ${reqId}` }, { status: 404 });
    }
    await scopedIncident(request, existing.incidentId);
    const dispatch = await coordinationStore.simulateDispatchConfirm(reqId);
    await audit({
      actorId: user.id,
      action: "dispatch.confirmed",
      object: "dispatch",
      objectId: reqId,
    });
    return Response.json({ dispatch });
  } catch (error) {
    return toErrorResponse(error);
  }
}
