import { statusUpdateSchema } from "@/modules/incidents/validation";
import { getStore, toErrorResponse } from "../../../_lib";

// Public status endpoint: records user-confirmed progress only.
// source is fixed to "user" — staff sources arrive with RBAC (Phase 2).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body: unknown = await request.json();
    const input = statusUpdateSchema.parse(body);
    const record = getStore().appendStatus(id, input.to, {
      source: "user",
      note: input.note,
      idempotencyKey: input.idempotencyKey,
    });
    return Response.json({ incident: record });
  } catch (error) {
    return toErrorResponse(error);
  }
}
