import { coordinationStore } from "@/lib/coordination-store";
import { toErrorResponse } from "../../../_lib";

// Dev-only mock dispatch confirmation. Response is flagged simulated.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ reqId: string }> },
) {
  try {
    const { reqId } = await params;
    const dispatch = coordinationStore.simulateDispatchConfirm(reqId);
    return Response.json({ dispatch });
  } catch (error) {
    return toErrorResponse(error);
  }
}
