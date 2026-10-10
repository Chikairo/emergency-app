import { coordinationStore } from "@/lib/coordination-store";
import { contactCreateSchema } from "@/modules/coordination/validation";
import { scopedIncident, toErrorResponse } from "../../../_lib";

// Trusted contacts require explicit consent (400 without it).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await scopedIncident(request, id);
    const body: unknown = await request.json();
    const contact = await coordinationStore.addContact(id, contactCreateSchema.parse(body));
    return Response.json({ contact }, { status: 201 });
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
    await scopedIncident(request, id);
    return Response.json({ contacts: await coordinationStore.listContacts(id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
