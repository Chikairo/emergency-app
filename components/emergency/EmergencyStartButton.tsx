"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// One-tap emergency start: creates the incident immediately through the
// existing incident API, then moves to the waiting screen. No questionnaire,
// no description field. The idempotency key is stable across retries so
// double-taps and slow networks can never fork duplicate incidents.
export function EmergencyStartButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef<string | null>(null);

  async function startNow() {
    if (pending) return;
    setPending(true);
    setError(null);
    if (keyRef.current === null) {
      keyRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `web-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    }
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affectsSelf: true,
          emergencyType: "Unspecified emergency",
          triage: [],
          idempotencyKey: keyRef.current,
        }),
      });
      const data = (await res.json()) as { incident?: { id: string }; error?: string };
      if (!res.ok || !data.incident) {
        throw new Error(data.error ?? "Could not start your emergency request. Nothing was sent.");
      }
      router.push(`/incidents/${data.incident.id}/waiting`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start your emergency request.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-[2px]">
      <button
        type="button"
        onClick={startNow}
        disabled={pending}
        aria-label="Report an emergency now"
        className="group relative flex aspect-square w-[clamp(10rem,20vw,12.5rem)] flex-col items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#ff4b52] to-[#ed343b] px-4 text-white shadow-[0_18px_36px_rgba(237,52,59,0.28)] ring-8 ring-[#ed343b]/10 transition-transform hover:scale-[1.03] disabled:cursor-wait disabled:opacity-70 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#ed343b]"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8 fill-current">
          <path d="M12 2a2 2 0 0 0-2 2v.36A7 7 0 0 0 6 10v4l-1.4 2.1A1 1 0 0 0 5.43 18h13.14a1 1 0 0 0 .83-1.9L18 14v-4a7 7 0 0 0-4-5.64V4a2 2 0 0 0-2-2Zm-3 18a3 3 0 0 0 6 0H9Z" />
        </svg>
        <span className="text-center text-base font-black leading-tight sm:text-[17px]">
          {pending ? "SENDING ALERT…" : <>I NEED<br />EMERGENCY HELP</>}
        </span>
      </button>
      <p className="mt-[10px] text-[12px] text-[#718096]">Tap to start emergency support</p>
      {error && (
        <p className="mt-[10px] max-w-xs text-center text-lg font-semibold text-[#c51f2b]" role="alert">
          {error} Tap again to retry.
        </p>
      )}
    </div>
  );
}