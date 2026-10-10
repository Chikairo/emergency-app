import { closeIncidentSchema } from "@/modules/coordination/validation";
import { getStore, toErrorResponse } from "../../../_lib";

// Incident closure through the same transition rules as any status change.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!getStore().getIncident(id)) throw new Error(`Incident not found: ${id}`);
    const body: unknown = await request.json();
    const input = closeIncidentSchema.parse(body);
    const record = getStore().appendStatus(
      id,
      input.outcome === "completed" ? "COMPLETED_HANDED_OVER" : "CANCELLED",
      {
        source: "user",
        note: input.reason,
        idempotencyKey: input.idempotencyKey,
      },
    );
    return Response.json({ incident: record });
  } catch (error) {
    return toErrorResponse(error);
  }
}
