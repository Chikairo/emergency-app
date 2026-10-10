"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FailureBanner } from "@/components/ui/FailureBanner";

export default function ReportPage() {
  const router = useRouter();
  const [affectsSelf, setAffectsSelf] = useState(true);
  const [emergencyType, setEmergencyType] = useState("");
  const [q1, setQ1] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(skipTriage: boolean) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affectsSelf,
          emergencyType: emergencyType || "Unspecified emergency",
          triage: skipTriage
            ? []
            : [
                ...(q1 ? [{ question: "What happened?", answer: q1 }] : []),
              ],
          idempotencyKey:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `web-${Date.now()}`,
        }),
      });
      const data = (await res.json()) as { incident?: { id: string }; error?: string };
      if (!res.ok || !data.incident) {
        throw new Error(data.error ?? "Could not start the report. Nothing was sent.");
      }
      router.push(`/incidents/${data.incident.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the report.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-bold">Report an emergency</h1>

      {error && (
        <FailureBanner
          title="Report not sent"
          detail={error}
        />
      )}

      <fieldset className="rounded-2xl bg-white p-5 shadow-sm">
        <legend className="px-1 text-xl font-bold">Who is this for?</legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {(
            [
              { label: "Myself", value: true },
              { label: "Someone else", value: false },
            ] as const
          ).map((opt) => (
            <button
              key={opt.label}
              type="button"
              aria-pressed={affectsSelf === opt.value}
              onClick={() => setAffectsSelf(opt.value)}
              className={`min-h-[56px] rounded-xl border-2 px-4 text-xl font-semibold ${
                affectsSelf === opt.value
                  ? "border-[#1D4ED8] bg-blue-50 text-blue-900"
                  : "border-zinc-200 bg-white text-zinc-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <label htmlFor="etype" className="text-xl font-bold">
          What is happening? <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <input
          id="etype"
          value={emergencyType}
          onChange={(e) => setEmergencyType(e.target.value)}
          placeholder="e.g. Severe bleeding"
          maxLength={120}
          className="mt-2 min-h-[56px] w-full rounded-xl border-2 border-zinc-200 px-4 text-xl"
        />
        <label htmlFor="triage1" className="mt-4 block text-xl font-bold">
          Anything else that helps? <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <input
          id="triage1"
          value={q1}
          onChange={(e) => setQ1(e.target.value)}
          placeholder="e.g. Person is awake and breathing"
          maxLength={500}
          className="mt-2 min-h-[56px] w-full rounded-xl border-2 border-zinc-200 px-4 text-xl"
        />
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={() => submit(false)}
        className="min-h-[64px] rounded-2xl bg-[#1D4ED8] px-8 text-2xl font-bold text-white disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send report"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => submit(true)}
        className="min-h-[56px] rounded-2xl border-2 border-[#C81E1E] px-8 text-xl font-bold text-[#C81E1E]"
      >
        Skip questions — get help now
      </button>
      <p className="text-lg text-zinc-600">
        Sending creates a local report only. It does not contact real emergency services.
      </p>
    </div>
  );
}
