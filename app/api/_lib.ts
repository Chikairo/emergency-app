import { ZodError } from "zod";
import { incidentStore } from "@/lib/incident-store";

export function toErrorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json(
      { error: "Invalid input", issues: error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  if (error instanceof Error && error.name === "InvalidTransitionError") {
    return Response.json({ error: error.message }, { status: 422 });
  }
  if (error instanceof Error && /not found/i.test(error.message)) {
    return Response.json({ error: error.message }, { status: 404 });
  }
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}

export function getStore() {
  return incidentStore;
}
