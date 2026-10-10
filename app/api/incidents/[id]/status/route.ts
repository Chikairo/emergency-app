import { audit } from "@/lib/audit";
import { statusUpdateSchema } from "@/modules/incidents/validation";
import { getStore, scopedIncident, toErrorResponse } from "../../../_lib";

// Status updates: owner, link-holder (anonymous reports), or staff.
// Source stays "user" here; staff sources arrive with RBAC (Phase 2+).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { user } = await scopedIncident(request, id);
    const body: unknown = await request.json();
    const input = statusUpdateSchema.parse(body);
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
