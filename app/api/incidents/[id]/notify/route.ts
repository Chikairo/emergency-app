import { coordinationStore } from "@/lib/coordination-store";
import { getStore, toErrorResponse } from "../../../_lib";

// Mock notify: records SENT per consented contact. Never claims delivery.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!getStore().getIncident(id)) throw new Error(`Incident not found: ${id}`);
    const notifications = coordinationStore.notifyContacts(id);
    return Response.json({ notifications });
  } catch (error) {
    return toErrorResponse(error);
  }
}
