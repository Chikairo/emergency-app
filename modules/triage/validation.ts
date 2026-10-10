import { z } from "zod";
import { TRIAGE_RULESET_VERSION } from "./flow";

// Voice and tap answers share this validation and the same submit endpoint.
// No separate triage logic per input method.

export const triageAnswerSchema = z.object({
  questionId: z.string().min(1).max(60),
  answer: z.enum(["yes", "no", "unsure", "skipped"]),
  note: z.string().trim().max(300).optional(),
});

export const submitTriageSchema = z.object({
  answers: z.array(triageAnswerSchema).min(1).max(10),
  rulesetVersion: z.literal(TRIAGE_RULESET_VERSION, {
    message: `Ruleset must be ${TRIAGE_RULESET_VERSION}`,
  }),
  idempotencyKey: z.string().trim().min(8).max(100),
});

export type TriageAnswerInput = z.infer<typeof triageAnswerSchema>;
export type SubmitTriageInput = z.infer<typeof submitTriageSchema>;
