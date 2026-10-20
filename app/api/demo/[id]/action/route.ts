import { ZodError } from "zod";
import { DemoError, viewFor } from "@/modules/demo/store";
import { demoStore } from "@/lib/demo-store";

function toError(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }
  if (error instanceof DemoError) {
    const status = error.code === "NOT_FOUND" ? 404 : error.code === "FORBIDDEN" ? 403 : 422;
    return Response.json({ error: error.message, code: error.code }, { status });
  }
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}

// Demo actions: approve/decline/reconsider/advance/arrive/doctor-contacted/
// consultation-previewed/reset. Role-enforced, idempotent, timestamped.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body: unknown = await request.json();
    const session = demoStore.applyAction(id, body);
    const parsed = body as { token?: unknown };
    const token = typeof parsed.token === "string" ? parsed.token : "";
    const role = token === session.agencyToken ? "agency" : "patient";
    return Response.json({ demo: viewFor(session, role) });
  } catch (error) {
    return toError(error);
  }
}
