import { z } from "zod";
import { audit } from "@/lib/audit";
import { getRequestUser } from "@/lib/auth-session";
import { db } from "@/lib/db";

const staffInput = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
});

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ error: "Same-origin request required." }, { status: 403 });
  }

  const sessionUser = await getRequestUser(request);
  if (!sessionUser) {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }

  try {
    const actor = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: { role: true },
    });
    if (actor?.role !== "SYSTEM_ADMIN") {
      return Response.json({ error: "System administrator access is required." }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "A valid JSON request body is required." }, { status: 400 });
    }
    const parsed = staffInput.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Enter a valid staff account email." }, { status: 400 });
    }

    const target = await db.user.findFirst({
      where: { email: { equals: parsed.data.email, mode: "insensitive" } },
      select: { id: true, email: true, role: true },
    });
    if (!target) {
      return Response.json(
        { error: "No account was found for that email. Ask the staff member to register first." },
        { status: 404 },
      );
    }
    if (target.role === "SYSTEM_ADMIN") {
      return Response.json({ email: target.email, role: "SYSTEM_ADMIN" });
    }

    await db.user.update({
      where: { id: target.id },
      data: { role: "SYSTEM_ADMIN" },
    });
    await audit({
      actorId: sessionUser.id,
      action: "staff.promoted",
      object: "user",
      objectId: target.id,
      metadata: { email: target.email, role: "SYSTEM_ADMIN" },
    });

    return Response.json({ email: target.email, role: "SYSTEM_ADMIN" });
  } catch (error) {
    console.error("[admin-staff] Could not grant staff access.", error);
    return Response.json({ error: "Staff access could not be updated. Please try again." }, { status: 500 });
  }
}
