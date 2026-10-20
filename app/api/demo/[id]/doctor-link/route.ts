import { DEMO_WHATSAPP_TEXT, whatsAppChatUrl } from "@/modules/demo/doctor";
import { demoStore } from "@/lib/demo-store";

// Doctor contact link, served on demand to the patient role only. The
// private number lives in server-side DOCTOR_WHATSAPP_NUMBER and is never
// hardcoded, logged, or embedded in client bundles.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const session = demoStore.getDemo(id);
  if (!session || token !== session.patientToken) {
    return Response.json({ error: `Demo session not found: ${id}` }, { status: 404 });
  }
  const url = whatsAppChatUrl(process.env["DOCTOR_WHATSAPP_NUMBER"], DEMO_WHATSAPP_TEXT);
  if (!url) {
    return Response.json({
      configured: false,
      message: "Doctor number is not configured. Ask the demo controller for the next step.",
    });
  }
  return Response.json({
    configured: true,
    url,
    message: "WhatsApp opens separately. Opening the chat does not place a call.",
  });
}
