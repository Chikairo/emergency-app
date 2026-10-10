import { audit } from "@/lib/audit";
import { RESPONDER_ROLES, requireRoles } from "@/lib/authz";
import { coordinationStore } from "@/lib/coordination-store";
import { getUser, toErrorResponse } from "../../../_lib";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ aid: string }> },
) {
  try {
    const user = requireRoles(await getUser(request), RESPONDER_ROLES);
    const { aid } = await params;
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
