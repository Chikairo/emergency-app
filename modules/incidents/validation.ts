import { z } from "zod";
import { INCIDENT_STATUSES } from "./status";

// Server-side input validation for Phase 1 reporting flows.
// Keep client forms in sync; the API re-validates everything here.

export const emergencyTypeSchema = z
  .string()
  .trim()
  .min(2, "Describe the emergency briefly")
  .max(120);

export const reportIncidentSchema = z.object({
  // Who the emergency affects: the reporter or someone else.
  affectsSelf: z.boolean(),
  emergencyType: emergencyTypeSchema,
  // Triage answers are optional — never block the urgent path.
  triage: z
    .array(z.object({ question: z.string().min(1).max(200), answer: z.string().min(1).max(500) }))
    .max(10)
    .default([]),
  idempotencyKey: z.string().trim().min(8).max(100),
});

export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  addressText: z.string().trim().max(300).nullable(),
  landmark: z.string().trim().max(300).nullable(),
  // pending | approximate | confirmed | unavailable
  locationState: z.enum(["pending", "approximate", "confirmed", "unavailable"]),
});

export const statusUpdateSchema = z.object({
  to: z.enum(INCIDENT_STATUSES),
  note: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().trim().min(8).max(100),
});

export type ReportIncidentInput = z.infer<typeof reportIncidentSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>;
