import { coordinationStore } from "@/lib/coordination-store";
import { medproCreateSchema } from "@/modules/coordination/validation";
import { scopedIncident, toErrorResponse } from "../../../_lib";

// Mock medical-professional request: PENDING with timeout fallback.
// Requesting follows incident access; accepting is staff-only.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await scopedIncident(request, id);
    const body: unknown = await request.json();
    const input = medproCreateSchema.parse(body);
    const medpro = await coordinationStore.requestMedpro(id, input.idempotencyKey);
    return Response.json({ medpro }, { status: 201 });
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
    await scopedIncident(request, id);
    return Response.json({ requests: await coordinationStore.listMedpro(id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
