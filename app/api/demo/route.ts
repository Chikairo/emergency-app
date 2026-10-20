import { ZodError } from "zod";
import { DemoError } from "@/modules/demo/store";
import { createDemoSchema } from "@/modules/demo/validation";
import { demoStore } from "@/lib/demo-store";

function toError(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json(
      { error: "Invalid input", issues: error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  if (error instanceof DemoError) {
    const status = error.code === "NOT_FOUND" ? 404 : error.code === "FORBIDDEN" ? 403 : 422;
    return Response.json({ error: error.message, code: error.code }, { status });
  }
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}

// Launch a demo: open to anyone holding the page (like one-tap reporting).
// Returns role-separated links; each token is unguessable and never leaks
// the other role's access.
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const input = createDemoSchema.parse(body);
    const session = demoStore.createDemo(input.destination, input.idempotencyKey);
    return Response.json(
      {
        demo: {
          id: session.id,
          patientUrl: `/demo/${session.id}/patient?token=${session.patientToken}`,
          agencyUrl: `/demo/${session.id}/agency?token=${session.agencyToken}`,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return toError(error);
  }
}
