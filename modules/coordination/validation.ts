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

export type DispatchCreateInput = z.infer<typeof dispatchCreateSchema>;
export type AssignmentCreateInput = z.infer<typeof assignmentCreateSchema>;
export type ContactCreateInput = z.infer<typeof contactCreateSchema>;
export type CloseIncidentInput = z.infer<typeof closeIncidentSchema>;
