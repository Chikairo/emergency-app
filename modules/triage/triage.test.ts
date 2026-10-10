import { describe, expect, it } from "vitest";
import { MemoryIncidentStore } from "@/modules/incidents/memory-store";
import {
  classifyUrgency,
  interpretSpeech,
  nextQuestion,
} from "@/modules/triage/flow";
import { submitTriageSchema } from "@/modules/triage/validation";

const RULESET = "rapid-v1-draft";

function incidentWith(store: MemoryIncidentStore): Promise<string> {
  return store
    .createIncident({
      affectsSelf: true,
      emergencyType: "Test",
      idempotencyKey: `triage-${Math.random().toString(36).slice(2)}`,
    })
    .then((r) => r.id);
}

describe("triage classification (unknown-safe, not a diagnosis)", () => {
  it("flags unresponsive / not breathing / severe bleeding as CRITICAL", () => {
    expect(classifyUrgency({ responsive: "no" }).urgency).toBe("CRITICAL");
    expect(classifyUrgency({ responsive: "yes", breathing: "no" }).urgency).toBe("CRITICAL");
    expect(
      classifyUrgency({ responsive: "yes", breathing: "yes", bleeding: "yes" }).urgency,
    ).toBe("CRITICAL");
  });

  it("keeps empty, skipped, or interrupted triage UNKNOWN", () => {
    expect(classifyUrgency({}).urgency).toBe("UNKNOWN");
    expect(
      classifyUrgency({ responsive: "skipped", breathing: "skipped", bleeding: "skipped" }).urgency,
    ).toBe("UNKNOWN");
    // Interrupted after one answer: still unknown, never low-risk.
    expect(classifyUrgency({ responsive: "yes" }).urgency).toBe("UNKNOWN");
  });

  it("marks uncertain key answers NEEDS_ASSESSMENT, clear answers URGENT", () => {
    expect(
      classifyUrgency({ responsive: "unsure", breathing: "yes", bleeding: "no" }).urgency,
    ).toBe("NEEDS_ASSESSMENT");
    expect(
      classifyUrgency({ responsive: "yes", breathing: "yes", bleeding: "no" }).urgency,
    ).toBe("URGENT");
  });

  it("stops routine questions on life-threatening signals", () => {
    expect(nextQuestion({ responsive: "no" })).toBeNull();
    expect(nextQuestion({})).toBe("responsive");
    expect(nextQuestion({ responsive: "yes" })).toBe("breathing");
  });

  it("interprets speech unknown-safe: ambiguous becomes unsure", () => {
    expect(interpretSpeech("yes, she is breathing")).toBe("yes");
    expect(interpretSpeech("no, not at all")).toBe("no");
    expect(interpretSpeech("I don't know")).toBe("unsure");
    expect(interpretSpeech("uhh ... hmm")).toBe("unsure");
  });

  it("rejects wrong ruleset versions", () => {
    expect(
      submitTriageSchema.safeParse({
        answers: [{ questionId: "responsive", answer: "yes" }],
        rulesetVersion: "other-v9",
        idempotencyKey: "key-12345678",
      }).success,
    ).toBe(false);
  });
});

describe("triage submission (voice and tap share one path)", () => {
  it("stores voice answers with source, classifies server-side", async () => {
    const store = new MemoryIncidentStore();
    const id = await incidentWith(store);
    const res = await store.submitTriage(
      id,
      {
        answers: [
          { questionId: "responsive", answer: "yes" },
          { questionId: "breathing", answer: "yes" },
          { questionId: "bleeding", answer: "no" },
        ],
        rulesetVersion: RULESET,
        idempotencyKey: "triage-key-aaa",
      },
      { source: "voice" },
    );
    expect(res.urgency).toBe("URGENT");
    expect(res.incident.triageResults).toHaveLength(3);
    expect(res.incident.triageResults[0]?.source).toBe("voice");
  });

  it("is idempotent on replay (no duplicate answers)", async () => {
    const store = new MemoryIncidentStore();
    const id = await incidentWith(store);
    const body = {
      answers: [{ questionId: "responsive", answer: "no" }],
      rulesetVersion: RULESET,
      idempotencyKey: "triage-key-dup",
    };
    const a = await store.submitTriage(id, body, { source: "tap" });
    const b = await store.submitTriage(id, body, { source: "tap" });
    expect(a.urgency).toBe("CRITICAL");
    expect(b.incident.triageResults).toHaveLength(1);
  });
});
