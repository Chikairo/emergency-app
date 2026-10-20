import { ZodError } from "zod";
import { DemoError, viewFor, type DemoRole } from "@/modules/demo/store";
import { demoViewSchema } from "@/modules/demo/validation";
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

function roleOf(session: { patientToken: string; agencyToken: string }, token: string): DemoRole | null {
  if (token === session.agencyToken) return "agency";
  if (token === session.patientToken) return "patient";
  return null;
}

// Role-filtered session read. Unknown tokens read as 404 so link guessing
// reveals nothing.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const token = demoViewSchema.parse({
      token: new URL(request.url).searchParams.get("token") ?? "",
    }).token;
    const session = demoStore.getDemo(id);
    if (!session) {
      return Response.json({ error: `Demo session not found: ${id}` }, { status: 404 });
    }
    const role = roleOf(session, token);
    if (!role) {
      return Response.json({ error: `Demo session not found: ${id}` }, { status: 404 });
    }
    return Response.json({ demo: viewFor(session, role) });
  } catch (error) {
    return toError(error);
  }
}
