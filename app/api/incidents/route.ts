import { getStore, toErrorResponse } from "../_lib";

export async function GET() {
  return Response.json({ incidents: getStore().listIncidents() });
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const record = getStore().createIncident(body);
    return Response.json({ incident: record }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
