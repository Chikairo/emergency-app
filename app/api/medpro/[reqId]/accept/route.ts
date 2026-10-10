import { coordinationStore } from "@/lib/coordination-store";
import { toErrorResponse } from "../../../_lib";

// Dev-only mock professional acceptance. Response is flagged simulated.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ reqId: string }> },
) {
  try {
    const { reqId } = await params;
    const medpro = coordinationStore.simulateMedproAccept(reqId);
    return Response.json({ medpro });
  } catch (error) {
    return toErrorResponse(error);
  }
}
