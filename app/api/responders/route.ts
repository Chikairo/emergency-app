import { RESPONDER_ROSTER } from "@/modules/responders/roster";

export async function GET() {
  return Response.json({ responders: RESPONDER_ROSTER });
}
