"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FailureBanner } from "@/components/ui/FailureBanner";
import {
  TRIAGE_QUESTIONS,
  TRIAGE_RULESET_VERSION,
  interpretSpeech,
  nextQuestion,
  type TriageAnswerValue,
} from "@/modules/triage/flow";

// Minimal Web Speech API shapes (avoids lib.dom gaps for prefixed APIs).
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getRecognitionConstructor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const ctor = w["SpeechRecognition"] ?? w["webkitSpeechRecognition"];
  return (ctor as new () => SpeechRecognitionLike) ?? null;
}

type MicState = "idle" | "listening" | "denied" | "error" | "unsupported";

const URGENCY_LABEL: Record<string, string> = {
  CRITICAL: "Critical — immediate emergency response needed",
  URGENT: "Urgent — prompt professional assessment needed",
  NEEDS_ASSESSMENT: "Needs assessment — further evaluation required",
  UNKNOWN: "Unknown — not enough information to assess safely",
};

export function VoiceTriage({ incidentId }: { incidentId: string }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, TriageAnswerValue>>({});
  const [mic, setMic] = useState<MicState>("idle");
  const [micError, setMicError] = useState<string | null>(null);
  const [heard, setHeard] = useState<string>("");
  const [confirm, setConfirm] = useState<{ qid: string; value: TriageAnswerValue; text: string } | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [done, setDone] = useState<{ urgency: string; basis: string[] } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const answersRef = useRef(answers);
  const keyCounter = useRef(0);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const supported = getRecognitionConstructor() !== null;
  const synthSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const currentId = nextQuestion(answers);
  const current = TRIAGE_QUESTIONS.find((q) => q.id === currentId) ?? null;

  const speak = useCallback(
    (text: string) => {
      if (!voiceOn || !synthSupported) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1;
        window.speechSynthesis.speak(u);
      } catch {
        // Speech output is best-effort; captions always shown.
      }
    },
    [voiceOn, synthSupported],
  );

  useEffect(() => {
    if (current) speak(current.text);
  }, [current, speak]);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
        window.speechSynthesis?.cancel();
      } catch {
        // Teardown is best-effort.
      }
    };
  }, []);

  async function submitAnswer(
    qid: string,
    value: TriageAnswerValue,
    opts: { source: "voice" | "tap"; note?: string },
  ) {
    setBusy(true);
    setFailed(null);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: opts.source,
          answers: [{ questionId: qid, answer: value, ...(opts.note ? { note: opts.note } : {}) }],
          rulesetVersion: TRIAGE_RULESET_VERSION,
          idempotencyKey: `${incidentId}-${qid}-${++keyCounter.current}`,
        }),
      });
      const data = (await res.json()) as { error?: string; urgency?: string; basis?: string[] };
      if (!res.ok) throw new Error(data.error ?? "Answer was not saved.");
      const next = { ...answersRef.current, [qid]: value };
      setAnswers(next);
      if (!nextQuestion(next)) {
        setDone({ urgency: data.urgency ?? "UNKNOWN", basis: data.basis ?? [] });
      }
      router.refresh();
    } catch (e) {
      setFailed(e instanceof Error ? e.message : "Answer was not saved.");
    } finally {
      setBusy(false);
    }
  }

  function answerTap(qid: string, value: TriageAnswerValue) {
    stopMic();
    submitAnswer(qid, value, { source: "tap" });
  }

  function startMic() {
    setMicError(null);
    const Ctor = getRecognitionConstructor();
    if (!Ctor) {
      setMic("unsupported");
      return;
    }
    stopMic();
    try {
      const rec = new Ctor();
      rec.lang = "en-US";
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onresult = (e) => {
        const last = e.results[e.results.length - 1];
        if (last) setHeard(last[0]?.transcript ?? "");
        if (last?.isFinal && current) {
          const value = interpretSpeech(last[0]?.transcript ?? "");
          if (current.criticalOnYes || current.id === "responsive" || current.id === "breathing") {
            setConfirm({ qid: current.id, value, text: last[0]?.transcript ?? "" });
          } else if (current.id === "incident-type" || current.id === "location-known") {
            submitAnswer(current.id, "skipped", {
              source: "voice",
              note: last[0]?.transcript ?? "",
            });
          } else {
            submitAnswer(current.id, value, { source: "voice" });
          }
          stopMic();
        }
      };
      rec.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setMic("denied");
        } else {
          setMic("error");
          setMicError(
            e.error === "network"
              ? "Speech recognition needs a network connection in this browser. The buttons below work the same."
              : "Speech recognition had a problem. You can retry, or just tap an answer.",
          );
        }
      };
      rec.onend = () => setMic((m) => (m === "listening" ? "idle" : m));
      recRef.current = rec;
      rec.start();
      setMic("listening");
    } catch {
      setMic("error");
      setMicError("Could not start the microphone. Tap an answer instead.");
    }
  }

  function stopMic() {
    try {
      recRef.current?.stop();
    } catch {
      // Already stopped.
    }
    recRef.current = null;
    setMic((m) => (m === "listening" ? "idle" : m));
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // Best-effort.
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border-2 border-[#7F1D1D] bg-[#FBEAEA] p-4" role="status">
        <p className="text-xl font-bold text-[#5B1414]">
          Reported urgency: {URGENCY_LABEL[done.urgency] ?? done.urgency}
        </p>
        <ul className="mt-1 list-disc pl-5 text-lg text-[#5B1414]">
          {done.basis.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
        <p className="mt-2 text-base text-[#5B1414]">
          This is not a diagnosis — it only reflects what was reported ({TRIAGE_RULESET_VERSION},
          draft, not clinically approved). Keep following the guidance and available help options.
        </p>
      </div>
    );
  }

  if (!current) {
    return <p className="text-lg text-zinc-600">No further questions — follow the guidance above.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {failed && <FailureBanner title="Answer not saved" detail={failed} />}
      <div className="rounded-xl bg-[#FBEAEA] p-4" aria-live="polite">
        <p className="text-sm font-semibold text-[#7F1D1D]">Question (captioned — sound not required)</p>
        <p className="mt-1 text-2xl font-bold leading-8 text-[#2A1414]">{current.text}</p>
        <p className="mt-1 text-lg text-zinc-700">{current.caption}</p>
      </div>

      {confirm ? (
        <div className="rounded-xl border-2 border-[#7F1D1D] bg-white p-4" role="alertdialog" aria-label="Confirm heard answer">
          <p className="text-xl">
            We heard <strong>{confirm.value.toUpperCase()}</strong>
            {confirm.text ? ` (“${confirm.text}”)` : ""} — is that right?
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const c = confirm;
                setConfirm(null);
                submitAnswer(c.qid, c.value, { source: "voice", note: c.text || undefined });
              }}
              className="min-h-[56px] rounded-xl bg-[#7F1D1D] px-4 text-xl font-bold text-white disabled:opacity-50"
            >
              Yes, correct
            </button>
            <button
              type="button"
              onClick={() => setConfirm(null)}
              className="min-h-[56px] rounded-xl border-2 border-zinc-300 px-4 text-xl font-semibold"
            >
              Fix it
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Answer choices">
          {(
            [
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
              { label: "Not sure", value: "unsure" },
            ] as const
          ).map((o) => (
            <button
              key={o.value}
              type="button"
              disabled={busy}
              onClick={() => answerTap(current.id, o.value)}
              className="min-h-[64px] rounded-xl border-2 border-[#7F1D1D] bg-white px-2 text-xl font-bold text-[#5B1414] disabled:opacity-50"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => answerTap(current.id, "skipped")}
          className="min-h-[48px] rounded-xl border border-zinc-300 px-4 text-lg font-semibold"
        >
          Skip
        </button>
        {!supported || mic === "unsupported" ? (
          <p className="self-center text-base text-zinc-600">
            Voice input isn&apos;t supported in this browser — the buttons above work exactly the same.
          </p>
        ) : mic === "listening" ? (
          <button
            type="button"
            onClick={stopMic}
            className="min-h-[48px] flex-1 rounded-xl bg-zinc-900 px-4 text-lg font-bold text-white"
            aria-live="polite"
          >
            ● Listening{heard ? ` — “${heard}”` : "…"} (tap to stop)
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={startMic}
            className="min-h-[48px] flex-1 rounded-xl border-2 border-zinc-900 px-4 text-lg font-bold"
          >
            🎤 Answer aloud instead
          </button>
        )}
        {synthSupported && (
          <button
            type="button"
            onClick={() => {
              setVoiceOn((v) => !v);
              if (voiceOn) {
                try {
                  window.speechSynthesis.cancel();
                } catch {
                  // Best-effort.
                }
              }
            }}
            aria-pressed={voiceOn}
            className="min-h-[48px] rounded-xl border border-zinc-300 px-4 text-base font-semibold"
          >
            Spoken questions: {voiceOn ? "on" : "off"}
          </button>
        )}
      </div>
      {mic === "denied" && (
        <p role="alert" className="text-lg text-amber-900">
          Microphone blocked. Allow access in the browser, or keep tapping — nothing is lost.
        </p>
      )}
      {mic === "error" && micError && (
        <p role="alert" className="text-lg text-amber-900">{micError}</p>
      )}
    </div>
  );
}
