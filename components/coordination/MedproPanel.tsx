"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FailureBanner } from "@/components/ui/FailureBanner";
import type { MedproRecord } from "@/modules/coordination/store";

export function MedproPanel({
  incidentId,
  initial,
}: {
  incidentId: string;
  initial: MedproRecord[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(url: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <FailureBanner title="Medical-professional update failed" detail={error} />}
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          post(`/api/incidents/${incidentId}/medpro`, { idempotencyKey: `web-${Date.now()}` })
        }
        className="mt-2 min-h-[56px] rounded-xl bg-[#7F1D1D] px-5 text-lg font-bold text-white hover:bg-[#651414] disabled:opacity-50"
      >
        Request medical professional (mock)
      </button>
      <ul className="mt-3 flex flex-col gap-2">
        {initial.length === 0 && (
          <li className="text-lg text-zinc-600">
            No requests yet. Unanswered requests expire — saved guidance stays available.
          </li>
        )}
        {initial.map((m) => (
          <li key={m.id} className="rounded-xl border border-zinc-200 bg-white p-3 text-lg">
            <strong>{m.state}</strong>
            {m.simulated && <span className="text-zinc-500"> (simulated)</span>}
            {m.state === "PENDING" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => post(`/api/medpro/${m.id}/accept`)}
                className="ml-2 rounded-lg border border-zinc-300 px-3 py-2 text-base font-semibold"
              >
                Simulate accept
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
