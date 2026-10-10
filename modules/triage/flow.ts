// Rapid triage ruleset v1 — content scaffold, NOT clinically approved.
// Question wording, branching, categories, and triggers MUST be reviewed by
// qualified clinical reviewers before real-world use. The ruleset version is
// stored with every triage so classifications stay traceable.

export const TRIAGE_RULESET_VERSION = "rapid-v1-draft";

export type TriageAnswerValue = "yes" | "no" | "unsure" | "skipped";

export type Urgency = "CRITICAL" | "URGENT" | "NEEDS_ASSESSMENT" | "UNKNOWN";

export interface TriageQuestion {
  id: string;
  text: string;
  caption: string;
  // Stop routine questions when true and this answer is "yes".
  criticalOnYes?: boolean;
}

export const TRIAGE_QUESTIONS: TriageQuestion[] = [
  {
    id: "responsive",
    text: "Is the person awake and responding to you?",
    caption: "Tap Yes, No, or Not sure — or answer aloud.",
  },
  {
    id: "breathing",
    text: "Are they breathing normally?",
    caption: "Look at their chest. Tap Yes, No, or Not sure.",
  },
  {
    id: "bleeding",
    text: "Is there severe bleeding you can see?",
    caption: "Severe means heavy, spurting, or soaking through cloth.",
    criticalOnYes: true,
  },
  {
    id: "incident-type",
    text: "Was this a crash, a fall, or something else?",
    caption: "Answer in your own words, or tap Skip.",
  },
  {
    id: "location-known",
    text: "Do you know where you are right now?",
    caption: "A landmark or road name is enough.",
  },
];

export interface ClassifiedUrgency {
  urgency: Urgency;
  basis: string[];
  rulesetVersion: string;
}

/**
 * Classify urgency from answers. Uncertain, partial, or contradictory input
 * stays UNKNOWN — never downgraded. Not a diagnosis.
 */
export function classifyUrgency(
  answers: Partial<Record<string, TriageAnswerValue>>,
): ClassifiedUrgency {
  const basis: string[] = [];
  const get = (id: string): TriageAnswerValue => answers[id] ?? "skipped";

  if (get("responsive") === "no") {
    basis.push("Person reported as not responsive.");
    return { urgency: "CRITICAL", basis, rulesetVersion: TRIAGE_RULESET_VERSION };
  }
  if (get("breathing") === "no") {
    basis.push("Breathing reported as not normal.");
    return { urgency: "CRITICAL", basis, rulesetVersion: TRIAGE_RULESET_VERSION };
  }
  if (get("bleeding") === "yes") {
    basis.push("Severe bleeding reported.");
    return { urgency: "CRITICAL", basis, rulesetVersion: TRIAGE_RULESET_VERSION };
  }

  const core = ["responsive", "breathing", "bleeding"];
  const decided = core.filter((id) => get(id) === "yes" || get(id) === "no");
  const uncertain = core.filter((id) => get(id) === "unsure");
  if (decided.length === 0) {
    basis.push("Insufficient information to assess safely.");
    return { urgency: "UNKNOWN", basis, rulesetVersion: TRIAGE_RULESET_VERSION };
  }
  if (uncertain.length > 0) {
    basis.push("Key answers uncertain; further evaluation required.");
    return { urgency: "NEEDS_ASSESSMENT", basis, rulesetVersion: TRIAGE_RULESET_VERSION };
  }
  if (decided.length < core.length) {
    basis.push("Triage incomplete; insufficient information to assess safely.");
    return { urgency: "UNKNOWN", basis, rulesetVersion: TRIAGE_RULESET_VERSION };
  }
  basis.push("Person responsive and breathing; no severe bleeding reported.");
  return { urgency: "URGENT", basis, rulesetVersion: TRIAGE_RULESET_VERSION };
}

/** Next relevant question id, or null when triage should stop. */
export function nextQuestion(
  answers: Partial<Record<string, TriageAnswerValue>>,
): string | null {
  // Life-threatening signal: stop routine questions, act first.
  if (answers["responsive"] === "no" || answers["breathing"] === "no") return null;
  for (const q of TRIAGE_QUESTIONS) {
    if (!(q.id in answers)) {
      // Skip already-settled paths: no bleeding question needed when the
      // person is unresponsive — help path already triggered.
      return q.id;
    }
  }
  return null;
}

/**
 * Interpret a free-speech transcript into an answer value.
 * Unmatched or ambiguous speech becomes "unsure" (unknown-safe).
 */
export function interpretSpeech(transcript: string): TriageAnswerValue {
  const t = transcript.toLowerCase();
  if (/\b(not sure|unsure|don't know|dont know|maybe|skip)\b/.test(t)) return "unsure";
  if (/\b(no|nope|not |isn't|arent|aren't|can't|wont|don't)\b/.test(t)) return "no";
  if (/\b(yes|yeah|yep|yup|ok|okay|sure|affirmative)\b/.test(t)) return "yes";
  return "unsure";
}
