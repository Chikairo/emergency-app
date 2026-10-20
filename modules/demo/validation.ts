import { z } from "zod";

// Demo-mode validation. Same conventions as the rest of the app: Zod parses
// every input at the adapter boundary; routes re-validate everything.

export const demoDestinationSchema = z.enum([
  "demo-hospital-ikeja",
  "demo-clinic-surulere",
  "demo-centre-yaba",
]);

export const createDemoSchema = z.object({
  destination: demoDestinationSchema,
  idempotencyKey: z.string().trim().min(8).max(100),
});

export const demoActionSchema = z.object({
  action: z.enum([
    "approve",
    "decline",
    "reconsider",
    "advance",
    "arrive",
    "doctor-contacted",
    "consultation-previewed",
    "reset",
  ]),
  token: z.string().trim().min(8).max(200),
  idempotencyKey: z.string().trim().min(8).max(100),
  note: z.string().trim().max(300).optional(),
});

export const demoViewSchema = z.object({
  token: z.string().trim().min(8).max(200),
});

export type DemoDestination = z.infer<typeof demoDestinationSchema>;
export type DemoAction = z.infer<typeof demoActionSchema>["action"];
