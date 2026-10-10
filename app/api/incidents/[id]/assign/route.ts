import { coordinationStore } from "@/lib/coordination-store";
import { assignmentCreateSchema } from "@/modules/coordination/validation";
import { getStore, toErrorResponse } from "../../../_lib";

// Verified responders only — unverified volunteers are rejected (422).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!getStore().getIncident(id)) throw new Error(`Incident not found: ${id}`);
    const body: unknown = await request.json();
    const assignment = coordinationStore.assignResponder(
      id,
      assignmentCreateSchema.parse(body),
    );
    return Response.json({ assignment }, { status: 201 });
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
    return Response.json({ assignments: coordinationStore.listAssignments(id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
