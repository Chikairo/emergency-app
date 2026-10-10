import { getStore, toErrorResponse } from "../../../_lib";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body: unknown = await request.json();
    const record = getStore().updateLocation(id, body);
    return Response.json({ incident: record });
  } catch (error) {
    return toErrorResponse(error);
  }
}
