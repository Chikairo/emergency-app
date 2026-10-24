import { normalizeWhatsAppNumber, whatsAppChatUrl } from "@/modules/demo/doctor";
import { scopedIncident, toErrorResponse } from "../../../_lib";

const EMERGENCY_WHATSAPP_TEXT =
  "Hello, I am with someone having an emergency and need medical guidance. (Sent from FirstLink.)";

// Emergency-scoped doctor contact. The number comes only from the
// server-side DOCTOR_WHATSAPP_NUMBER variable: direct tel: calling plus an
// optional WhatsApp handoff when configured, honest fallback otherwise.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await scopedIncident(request, id);
    const raw = process.env["DOCTOR_WHATSAPP_NUMBER"];
    const digits = raw ? normalizeWhatsAppNumber(raw) : null;
    if (!digits) {
      return Response.json({
        configured: false,
        message:
          "Doctor contact is not available yet — no doctor number has been configured. " +
          "Emergency services above remain your first option.",
      });
    }
    return Response.json({
      configured: true,
      display: raw?.trim().startsWith("+") ? `+${digits}` : digits,
      telHref: `tel:+${digits}`,
      whatsappUrl: whatsAppChatUrl(raw, EMERGENCY_WHATSAPP_TEXT),
      message:
        "Calling dials directly on this device. WhatsApp opens in a separate app and " +
        "does not place a call by itself.",
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
