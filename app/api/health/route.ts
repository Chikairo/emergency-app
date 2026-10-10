export async function GET() {
  return Response.json(
    {
      status: "ok",
      app: "emergency-app",
      mocks: process.env.NEXT_PUBLIC_USE_MOCKS ?? "true",
      // Preferred backend. Development falls back to memory with a loud
      // warning when the database is unreachable; production never falls back.
      storage: process.env["DATABASE_URL"] ? "postgres" : "memory",
    },
    { status: 200 },
  );
}
