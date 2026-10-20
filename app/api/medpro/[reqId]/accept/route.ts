import { audit } from "@/lib/audit";
import { MEDPRO_ROLES, requireRoles } from "@/lib/authz";
import { coordinationStore } from "@/lib/coordination-store";
import { getUser, scopedIncident, toErrorResponse } from "../../../_lib";

// Dev-only mock professional acceptance. Response is flagged simulated.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ reqId: string }> },
) {
  try {
    const user = requireRoles(await getUser(request), MEDPRO_ROLES);
    const { reqId } = await params;
    const existing = await coordinationStore.getMedpro(reqId);
    if (!existing) {
      return Response.json({ error: `Med-pro request not found: ${reqId}` }, { status: 404 });
    }
    await scopedIncident(request, existing.incidentId);
    const medpro = await coordinationStore.simulateMedproAccept(reqId);
    await audit({
      actorId: user.id,
      action: "medpro.accepted",
      object: "medpro",
      objectId: reqId,
    });
    return Response.json({ medpro });
  } catch (error) {
    return toErrorResponse(error);
  }
}
