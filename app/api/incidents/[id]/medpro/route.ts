import { coordinationStore } from "@/lib/coordination-store";
import { medproCreateSchema } from "@/modules/coordination/validation";
import { getStore, toErrorResponse } from "../../../_lib";

// Mock medical-professional request: PENDING with timeout fallback.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!getStore().getIncident(id)) throw new Error(`Incident not found: ${id}`);
    const body: unknown = await request.json();
    const input = medproCreateSchema.parse(body);
    const medpro = coordinationStore.requestMedpro(id, input.idempotencyKey);
    return Response.json({ medpro }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!getStore().getIncident(id)) throw new Error(`Incident not found: ${id}`);
    return Response.json({ requests: coordinationStore.listMedpro(id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
