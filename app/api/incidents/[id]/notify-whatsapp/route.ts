import { audit } from "@/lib/audit";
import { isStaff } from "@/lib/authz";
import { coordinationStore } from "@/lib/coordination-store";
import {
  WhatsAppError,
  isWhatsAppConfigured,
  sendTemplateMessage,
  whatsappConfig,
} from "@/lib/integrations/whatsapp";
import { whatsappNotifySchema } from "@/modules/coordination/validation";
import { getUser, scopedIncident, toErrorResponse } from "../../../_lib";

// Real WhatsApp notification to one consented trusted contact. Owner or
// staff only (never anonymous link-holders: real messages leave the system).
// Unconfigured provider records FAILED honestly without sending anything.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getUser(request);
    const { incident } = await scopedIncident(request, id);
    const isOwner = Boolean(user && incident.reporter && incident.reporter === user.id);
    if (!user || (!isOwner && !isStaff(user.role))) {
      return Response.json({ error: `Incident not found: ${id}` }, { status: 404 });
    }
    const body: unknown = await request.json();
    const input = whatsappNotifySchema.parse(body);
    const contacts = await coordinationStore.listContacts(id);
    const contact = contacts.find((c) => c.id === input.contactId);
    if (!contact) {
      return Response.json({ error: "Contact is not part of this incident." }, { status: 404 });
    }
    const config = whatsappConfig();
    const template = config?.defaultTemplate ?? "emergency_alert";
    // Natural dedupe: an already-sent notification for this recipient and
    // template is returned instead of sending twice.
    const existing = await coordinationStore.findSentNotification(id, contact.address, template);
    if (existing) return Response.json({ notification: existing });

    if (!isWhatsAppConfigured() || !config) {
      const recorded = await coordinationStore.recordNotification(id, {
        channel: contact.channel,
        recipient: contact.address,
        template,
        provider: "whatsapp",
        state: "FAILED",
      });
      return Response.json({
        notification: recorded,
        error: "WhatsApp provider is not configured. Nothing was sent.",
      });
    }
    try {
      const sent = await sendTemplateMessage({
        to: contact.address.replace(/\D/g, ""),
        template: config.defaultTemplate,
        language: config.defaultLanguage,
        parameters: [id.slice(0, 8), incident.status],
      });
      const recorded = await coordinationStore.recordNotification(id, {
        channel: contact.channel,
        recipient: contact.address,
        template,
        provider: "whatsapp",
        state: "SENT",
        messageId: sent.providerMessageId,
      });
      await audit({
        actorId: user.id,
        action: "whatsapp.sent",
        object: "notification",
        objectId: recorded.id,
        metadata: { incidentId: id },
      });
      return Response.json({ notification: recorded });
    } catch (error) {
      const recorded = await coordinationStore.recordNotification(id, {
        channel: contact.channel,
        recipient: contact.address,
        template,
        provider: "whatsapp",
        state: "FAILED",
      });
      const status = error instanceof WhatsAppError ? error.status : 502;
      return Response.json(
        { notification: recorded, error: "WhatsApp send failed. Nothing was delivered." },
        { status },
      );
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}
