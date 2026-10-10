import { getStore, scopedIncident, toErrorResponse } from "../../../_lib";

// Shared by voice and tap triage: identical validation, ruleset, and
// classification. Source (voice|tap) is recorded per answer for audit.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await scopedIncident(request, id);
    const body: unknown = await request.json();
    const { source, ...triage } = (body ?? {}) as { source?: unknown };
    const result = await getStore().submitTriage(id, triage, {
      source: source === "voice" ? "voice" : "tap",
    });
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { incident } = await scopedIncident(request, id);
    return Response.json({
      triage: {
        answers: incident.triageResults,
        urgency: incident.urgency,
        basis: incident.urgencyBasis,
        rulesetVersion: incident.rulesetVersion,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
