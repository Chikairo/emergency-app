import { audit } from "@/lib/audit";
import { coordinationStore } from "@/lib/coordination-store";
import { scopedIncident, toErrorResponse } from "../../../_lib";

// Mock notify: records SENT per consented contact. Never claims delivery.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { user } = await scopedIncident(request, id);
    const notifications = await coordinationStore.notifyContacts(id);
    await audit({
      actorId: user?.id ?? null,
      action: "contacts.notified",
      object: "incident",
      objectId: id,
      metadata: { count: notifications.length },
    });
    return Response.json({ notifications });
  } catch (error) {
    return toErrorResponse(error);
  }
}
