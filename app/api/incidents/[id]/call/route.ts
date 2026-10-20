import {
  DailyError,
  getOrCreateRoom,
  isDailyConfigured,
} from "@/lib/integrations/daily";
import { isDemoMode } from "@/lib/demo-mode";
import { callCreateSchema } from "@/modules/coordination/validation";
import { scopedIncident, toErrorResponse } from "../../../_lib";

// Create (or retrieve) the incident's private video room. Anyone with
// incident access (owner, link-holder, staff) — the patient must be able
// to start this anonymously. Room creation alone connects nobody and
// exposes nothing; joining is separately role-checked.
// Without provider credentials this reports unconfigured honestly.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await scopedIncident(request, id);
    const body: unknown = await request.json();
    callCreateSchema.parse(body);
    if (!isDailyConfigured()) {
      return Response.json({
        configured: false,
        message: isDemoMode() && process.env["DAILY_ENABLED"] !== "true"
          ? "Live calls are disabled in this demo."
          : "Live voice and video calls are not configured on the server.",
      });
    }
    try {
      const room = await getOrCreateRoom(id);
      return Response.json({ configured: true, room, requiresJoin: true });
    } catch (error) {
      const status = error instanceof DailyError ? error.status : 502;
      return Response.json(
        { configured: true, error: "Video room could not be created." },
        { status },
      );
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}
