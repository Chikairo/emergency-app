import {
  CALL_DOCTOR_ROLES,
  canAccessIncident,
  requireRoles,
} from "@/lib/authz";
import {
  DailyError,
  getOrCreateRoom,
  isDailyConfigured,
  issueMeetingToken,
  roomNameForIncident,
} from "@/lib/integrations/daily";
import { isDemoMode } from "@/lib/demo-mode";
import { callJoinSchema } from "@/modules/coordination/validation";
import { getUser, scopedIncident, toErrorResponse } from "../../../../_lib";

// Issue a participant-scoped meeting token. Patients prove ownership (owner
// or anonymous link-holder of an anonymous report); doctors prove a medical
// role. The provider API key never leaves the server.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getUser(request);
    const { incident } = await scopedIncident(request, id);
    const body: unknown = await request.json();
    const input = callJoinSchema.parse(body);
    if (!isDailyConfigured()) {
      return Response.json({
        configured: false,
        message: isDemoMode() && process.env["DAILY_ENABLED"] !== "true"
          ? "Live calls are disabled in this demo."
          : "Live voice and video calls are not configured on the server.",
      });
    }
    if (input.as === "doctor") {
      requireRoles(user, CALL_DOCTOR_ROLES);
    } else if (!canAccessIncident(user, incident)) {
      return Response.json({ error: `Incident not found: ${id}` }, { status: 404 });
    }
    const identity =
      input.as === "doctor" && user ? `doctor:${user.id}` : `patient:${id.slice(0, 8)}`;
    try {
      const roomName = roomNameForIncident(id);
      const { token } = await issueMeetingToken(roomName, input.as, identity);
      const room = await getOrCreateRoom(id);
      return Response.json({ configured: true, url: room.url, token, as: input.as });
    } catch (error) {
      const status = error instanceof DailyError ? error.status : 502;
      return Response.json(
        { configured: true, error: "Meeting access could not be issued." },
        { status },
      );
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}
