import { audit } from "@/lib/audit";
import { DISPATCH_ROLES, requireRoles } from "@/lib/authz";
import { coordinationStore } from "@/lib/coordination-store";
import { getUser, toErrorResponse } from "../../../_lib";

// Dev-only mock acknowledgement. Response is flagged simulated.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ reqId: string }> },
) {
  try {
    const user = requireRoles(await getUser(request), DISPATCH_ROLES);
    const { reqId } = await params;
    const dispatch = await coordinationStore.simulateDispatchAck(reqId);
    await audit({
      actorId: user.id,
      action: "dispatch.acknowledged",
      object: "dispatch",
      objectId: reqId,
    });
    return Response.json({ dispatch });
  } catch (error) {
    return toErrorResponse(error);
  }
}
