"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FailureBanner } from "@/components/ui/FailureBanner";

export function ClosePanel({ incidentId }: { incidentId: string }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState("completed");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function close() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, reason: reason || undefined, idempotencyKey: `web-${Date.now()}` }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not close the incident.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not close the incident.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <FailureBanner title="Closure failed" detail={error} />}
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <select
          aria-label="Closure outcome"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          className="min-h-[56px] rounded-xl border-2 border-zinc-200 bg-white px-3 text-lg"
        >
          <option value="completed">Completed / handed over</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          aria-label="Closure reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          maxLength={300}
          className="min-h-[56px] flex-1 rounded-xl border-2 border-zinc-200 bg-white px-4 text-lg text-zinc-900 placeholder:text-zinc-500"
        />
        <button
          type="button"
          disabled={busy}
          onClick={close}
          className="min-h-[56px] rounded-xl bg-zinc-900 px-5 text-lg font-bold text-white disabled:opacity-50"
        >
          Close incident
        </button>
      </div>
      <p className="mt-2 text-base text-zinc-600">
        History is preserved — closure appends an event and follows the same transition rules.
      </p>
    </div>
  );
}
