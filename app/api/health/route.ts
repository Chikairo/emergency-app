export async function GET() {
  return Response.json(
    {
      status: "ok",
      app: "emergency-app",
      mocks: process.env.NEXT_PUBLIC_USE_MOCKS ?? "true",
    },
    { status: 200 },
  );
}
