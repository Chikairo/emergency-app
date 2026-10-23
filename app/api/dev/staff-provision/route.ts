import { getRequestUser } from "@/lib/auth-session";
import { db } from "@/lib/db";
import {
  isDevelopmentStaffSetupEnabled,
  isLoopbackHostname,
} from "@/lib/staff-provision";

function unavailable(): Response {
  return Response.json(
    { error: "Local staff setup is unavailable in this environment." },
    { status: 404 },
  );
}

export async function POST(request: Request) {
  if (
    !isDevelopmentStaffSetupEnabled(
      process.env["NODE_ENV"],
      process.env["DATABASE_URL"],
    )
  ) {
    return unavailable();
  }

  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (
    !isLoopbackHostname(requestUrl.hostname) ||
    !origin ||
    origin !== requestUrl.origin
  ) {
    return Response.json({ error: "Local same-origin request required." }, { status: 403 });
  }

  const user = await getRequestUser(request);
  if (!user) {
    return Response.json(
      { error: "Sign in with the new account before staff setup." },
      { status: 401 },
    );
  }
  if (user.role !== "BYSTANDER" && user.role !== "PATIENT") {
    return Response.json(
      { error: "Only a regular local account can use staff setup." },
      { status: 409 },
    );
  }

  try {
    await db.user.update({
      where: { id: user.id },
      data: { role: "SYSTEM_ADMIN" },
    });
  } catch {
    return Response.json(
      { error: "The local account was created, but system administrator access could not be enabled." },
      { status: 500 },
    );
  }

  return Response.json({ role: "SYSTEM_ADMIN" });
}
