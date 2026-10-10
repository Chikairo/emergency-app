import { audit } from "@/lib/audit";
import { closeIncidentSchema } from "@/modules/coordination/validation";
import { getStore, scopedIncident, toErrorResponse } from "../../../_lib";

// Incident closure through the same transition rules as any status change.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { user } = await scopedIncident(request, id);
    const body: unknown = await request.json();
    const input = closeIncidentSchema.parse(body);
    const record = await getStore().appendStatus(
      id,
      input.outcome === "completed" ? "COMPLETED_HANDED_OVER" : "CANCELLED",
      {
        actor: user?.id ?? null,
        source: "user",
        note: input.reason,
        idempotencyKey: input.idempotencyKey,
      },
    );
    await audit({
      actorId: user?.id ?? null,
      action: "incident.closed",
      object: "incident",
      objectId: id,
      metadata: { outcome: input.outcome },
    });
    return Response.json({ incident: record });
  } catch (error) {
    return toErrorResponse(error);
  }
}
