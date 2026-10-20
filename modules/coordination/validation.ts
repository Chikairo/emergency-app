import { z } from "zod";

// Phase 2 coordination inputs. All integrations are mocks in development:
// every simulated confirmation is labelled as such in responses.

export const dispatchCreateSchema = z.object({
  targetType: z.enum(["emergency-service", "ambulance-partner"]),
  targetName: z.string().trim().min(2).max(120),
  idempotencyKey: z.string().trim().min(8).max(100),
});

export const medproCreateSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(100),
});

export const assignmentCreateSchema = z.object({
  responderEmail: z.string().trim().email().max(120),
  idempotencyKey: z.string().trim().min(8).max(100),
});

export const contactCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  channel: z.enum(["PUSH", "SMS", "EMAIL", "IN_APP"]),
  address: z.string().trim().min(3).max(160),
  consent: z.literal(true, {
    message: "Explicit consent is required before notifying a contact",
  }),
});

export const closeIncidentSchema = z.object({
  outcome: z.enum(["completed", "cancelled"]),
  reason: z.string().trim().max(300).optional(),
  idempotencyKey: z.string().trim().min(8).max(100),
});

// WhatsApp notification to one consented trusted contact of the incident.
// The recipient must already exist on the incident: no ad-hoc numbers.
export const whatsappNotifySchema = z.object({
  contactId: z.string().trim().min(1).max(100),
  idempotencyKey: z.string().trim().min(8).max(100),
});

// Video call lifecycle. Creation is idempotent per incident (deterministic
// room names); joining is participant-scoped and role-checked.
export const callCreateSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(100),
});

export const callJoinSchema = z.object({
  as: z.enum(["patient", "doctor"]),
});

// Human-confirmed ambulance availability on a real incident. Decided by an
// authorized dispatcher, never simulated: confirmed/declined states are
// recorded exactly as decided, with actor and timestamp kept by callers.
export const ambulanceDecisionSchema = z.object({
  decision: z.enum(["available", "dispatch", "confirm", "decline"]),
  vehicle: z.string().trim().min(1).max(60).optional(),
  note: z.string().trim().max(300).optional(),
  idempotencyKey: z.string().trim().min(8).max(100),
});

export type DispatchCreateInput = z.infer<typeof dispatchCreateSchema>;
export type AmbulanceDecisionInput = z.infer<typeof ambulanceDecisionSchema>;
export type AssignmentCreateInput = z.infer<typeof assignmentCreateSchema>;
export type ContactCreateInput = z.infer<typeof contactCreateSchema>;
export type CloseIncidentInput = z.infer<typeof closeIncidentSchema>;
