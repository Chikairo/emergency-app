import { getStore, scopedIncident, toErrorResponse } from "../../../_lib";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await scopedIncident(request, id);
    const body: unknown = await request.json();
    const record = await getStore().updateLocation(id, body);
    return Response.json({ incident: record });
  } catch (error) {
    return toErrorResponse(error);
  }
}
