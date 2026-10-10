import { getStore, toErrorResponse } from "../../../_lib";

// Shared by voice and tap triage: identical validation, ruleset, and
// classification. Source (voice|tap) is recorded per answer for audit.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!getStore().getIncident(id)) {
      return Response.json({ error: `Incident not found: ${id}` }, { status: 404 });
    }
    const body: unknown = await request.json();
    const { source, ...triage } = (body ?? {}) as { source?: unknown };
    const result = getStore().submitTriage(id, triage, {
      source: source === "voice" ? "voice" : "tap",
    });
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const incident = getStore().getIncident(id);
    if (!incident) {
      return Response.json({ error: `Incident not found: ${id}` }, { status: 404 });
    }
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
