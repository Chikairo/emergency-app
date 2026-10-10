import { coordinationStore } from "@/lib/coordination-store";
import { toErrorResponse } from "../../../_lib";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ aid: string }> },
) {
  try {
    const { aid } = await params;
    const assignment = coordinationStore.acknowledgeAssignment(aid);
    return Response.json({ assignment });
  } catch (error) {
    return toErrorResponse(error);
  }
}
