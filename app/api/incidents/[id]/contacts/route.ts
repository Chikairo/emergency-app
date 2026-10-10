import { coordinationStore } from "@/lib/coordination-store";
import { contactCreateSchema } from "@/modules/coordination/validation";
import { getStore, toErrorResponse } from "../../../_lib";

// Trusted contacts require explicit consent (422 without it).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!getStore().getIncident(id)) throw new Error(`Incident not found: ${id}`);
    const body: unknown = await request.json();
    const contact = coordinationStore.addContact(id, contactCreateSchema.parse(body));
    return Response.json({ contact }, { status: 201 });
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
    if (!getStore().getIncident(id)) throw new Error(`Incident not found: ${id}`);
    return Response.json({ contacts: coordinationStore.listContacts(id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
