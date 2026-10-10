import { coordinationStore } from "@/lib/coordination-store";
import { getStore, toErrorResponse } from "../../../_lib";

function mustIncident(id: string) {
  const incident = getStore().getIncident(id);
  if (!incident) throw new Error(`Incident not found: ${id}`);
  return incident;
}

// Mock dispatch request: records SENT, never dispatched.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    mustIncident(id);
    const body: unknown = await request.json();
    const dispatch = coordinationStore.requestDispatch(id, body);
    return Response.json({ dispatch }, { status: 201 });
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
    mustIncident(id);
    return Response.json({ dispatches: coordinationStore.listDispatches(id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
