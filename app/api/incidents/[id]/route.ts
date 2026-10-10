import { getStore, toErrorResponse } from "../../_lib";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const record = getStore().getIncident(id);
    if (!record) {
      return Response.json({ error: `Incident not found: ${id}` }, { status: 404 });
    }
    return Response.json({ incident: record });
  } catch (error) {
    return toErrorResponse(error);
  }
}
