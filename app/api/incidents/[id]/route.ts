import { scopedIncident, toErrorResponse } from "../../_lib";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { incident } = await scopedIncident(request, id);
    return Response.json({ incident });
  } catch (error) {
    return toErrorResponse(error);
  }
}
