"use client";

import { useState } from "react";

type Outcome = "coming" | "no-answer" | "couldnt-call" | null;

const COPY: Record<Exclude<Outcome, null>, { title: string; detail: string }> = {
  coming: {
    title: "You reported: help is coming.",
    detail:
      "This is your own report, recorded on this device at the time below. " +
      "It was not verified by the emergency network and did not notify anyone.",
  },
  "no-answer": {
    title: "You reported: no answer.",
    detail:
      "Your report was recorded on this device only. Try calling again, and keep " +
      "following the first-aid steps above.",
  },
  "couldnt-call": {
    title: "You reported: could not call.",
    detail:
      "Your report was recorded on this device only. Ask someone nearby to call, " +
      "or try again when you can.",
  },
};

// Manual call-outcome confirmation. The website cannot detect whether a
// telephone call was answered, so this records only what the user tells us.
export function ContactConfirmation() {
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [at, setAt] = useState<string | null>(null);

  function choose(value: Exclude<Outcome, null>) {
    setOutcome(value);
    setAt(new Date().toLocaleTimeString());
  }

  function reset() {
    setOutcome(null);
    setAt(null);
  }

  return (
    <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xl font-bold text-zinc-900">Did emergency services answer?</p>
      <p className="mt-1 text-base text-zinc-600">
        The website cannot tell whether your call connected — please tell us what happened.
      </p>
      {!outcome ? (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => choose("coming")}
            className="min-h-[56px] rounded-xl bg-[#0E7C3E] px-4 text-lg font-bold text-white"
          >
            Help is coming
          </button>
          <button
            type="button"
            onClick={() => choose("no-answer")}
            className="min-h-[56px] rounded-xl border-2 border-zinc-300 bg-white px-4 text-lg font-bold text-zinc-800"
          >
            No answer
          </button>
          <button
            type="button"
            onClick={() => choose("couldnt-call")}
            className="min-h-[56px] rounded-xl border-2 border-zinc-300 bg-white px-4 text-lg font-bold text-zinc-800"
          >
            Couldn&apos;t call
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded-xl bg-white p-4" role="status">
          <p className="text-lg font-bold text-zinc-900">{COPY[outcome].title}</p>
          <p className="mt-1 text-base text-zinc-600">
            {COPY[outcome].detail}
            {at ? ` Reported by you at ${at}.` : ""}
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-2 text-lg font-semibold text-[#5B1414] underline"
          >
            Change my answer
          </button>
        </div>
      )}
    </div>
  );
}
