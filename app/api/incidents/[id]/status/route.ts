import { audit } from "@/lib/audit";
import { ForbiddenRoleError, isStaff } from "@/lib/authz";
import { statusUpdateSchema } from "@/modules/incidents/validation";
import { getStore, scopedIncident, toErrorResponse } from "../../../_lib";

// Status updates: owner, link-holder (anonymous reports), or staff.
// Non-staff callers may only record receipt-level states. Acknowledgement,
// dispatch, and downstream states are staff-recorded only, so a client can
// never mark its own incident dispatched.
const OWNER_WRITABLE = ["REQUEST_SENT", "UNABLE_TO_CONFIRM", "CANCELLED"] as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { user } = await scopedIncident(request, id);
    const body: unknown = await request.json();
    const input = statusUpdateSchema.parse(body);
    if ((!user || !isStaff(user.role)) && !(OWNER_WRITABLE as readonly string[]).includes(input.to)) {
      throw new ForbiddenRoleError();
    }
    const record = await getStore().appendStatus(id, input.to, {
      actor: user?.id ?? null,
      source: "user",
      note: input.note,
      idempotencyKey: input.idempotencyKey,
    });
    await audit({
      actorId: user?.id ?? null,
      action: "incident.status",
      object: "incident",
      objectId: id,
      metadata: { to: input.to },
    });
    return Response.json({ incident: record });
  } catch (error) {
    return toErrorResponse(error);
  }
}
