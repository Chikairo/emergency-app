import { STAFF_ROLES, requireRoles } from "@/lib/authz";
import { RESPONDER_ROSTER } from "@/modules/responders/roster";
import { getUser, toErrorResponse } from "../_lib";

// Fictional development roster backing the dispatcher assignment UI
// (rendered only in the staff-gated coordination section). Staff-only so
// anonymous and public callers cannot enumerate it.
export async function GET(request: Request) {
  try {
    requireRoles(await getUser(request), STAFF_ROLES);
    return Response.json({ responders: RESPONDER_ROSTER });
  } catch (error) {
    return toErrorResponse(error);
  }
}
