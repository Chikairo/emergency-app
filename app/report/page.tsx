"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { FailureBanner } from "@/components/ui/FailureBanner";

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `web-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

// True only after client hydration: the help button stays disabled until
// taps can actually reach the handler (no dead pre-hydration clicks).
function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export default function ReportPage() {
  const router = useRouter();
  const mounted = useMounted();
  const [affectsSelf, setAffectsSelf] = useState(true);
  const [emergencyType, setEmergencyType] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Retry key: created in the tap handler (never during render), reused across
  // retries so double-taps can't fork incidents. Cleared after failures.
  const keyRef = useRef<string | null>(null);

  async function createNow() {
    setPending(true);
    setError(null);
    if (keyRef.current === null) keyRef.current = newKey();
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affectsSelf,
          emergencyType: emergencyType.trim() || "Unspecified emergency",
          triage: [],
          idempotencyKey: keyRef.current,
        }),
      });
      const data = (await res.json()) as { incident?: { id: string }; error?: string };
      if (!res.ok || !data.incident) {
        throw new Error(data.error ?? "Could not save the report. Nothing was sent.");
      }
      router.push(`/incidents/${data.incident.id}`);
    } catch (e) {
      // New key only after a confirmed failure, so a retry is a new attempt.
      keyRef.current = newKey();
      setError(e instanceof Error ? e.message : "Could not save the report.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-bold">Get emergency help</h1>
      <p className="text-xl leading-8 text-zinc-700">
        One tap creates your report and shows guidance plus help options immediately.
        Details can follow — nothing here delays help.
      </p>

      {error && <FailureBanner title="Report not saved" detail={error} />}

      <button
        type="button"
        disabled={pending || !mounted}
        onClick={createNow}
        className="min-h-[80px] rounded-2xl bg-[#C81E1E] px-8 text-3xl font-bold text-white shadow-lg hover:bg-[#A61717] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Get Emergency Help"}
      </button>

      <div className="rounded-2xl bg-white p-5 shadow-sm" role="radiogroup" aria-labelledby="who-label">
        <p id="who-label" className="text-xl font-bold">
          Who is this for? <span className="font-normal text-zinc-500">(optional)</span>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
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
                  ? "border-[#7F1D1D] bg-[#FBEAEA] text-[#5B1414]"
                  : "border-zinc-200 bg-white text-zinc-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <label htmlFor="etype" className="mt-4 block text-xl font-bold">
          What is happening? <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <input
          id="etype"
          value={emergencyType}
          onChange={(e) => setEmergencyType(e.target.value)}
          placeholder="e.g. Severe bleeding"
          maxLength={120}
          className="mt-2 min-h-[56px] w-full rounded-xl border-2 border-zinc-200 bg-white px-4 text-xl text-zinc-900 placeholder:text-zinc-500"
        />
      </div>

      <p className="text-lg text-zinc-600">
        After tapping, you can answer a few quick voice or tap questions, confirm your location,
        and track real status. Sending creates a local report only — it does not contact real
        emergency services.
      </p>
    </div>
  );
}
