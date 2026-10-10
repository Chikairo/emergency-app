"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FailureBanner } from "@/components/ui/FailureBanner";
import type { AssignmentRecord } from "@/modules/coordination/store";
import type { RosterResponder } from "@/modules/responders/roster";

export function RespondersPanel({
  incidentId,
  initial,
}: {
  incidentId: string;
  initial: AssignmentRecord[];
}) {
  const router = useRouter();
  const [roster, setRoster] = useState<RosterResponder[]>([]);
  const [email, setEmail] = useState("responder@example.com");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/responders")
      .then((r) => r.json())
      .then((d: { responders: RosterResponder[] }) => {
        if (!cancelled) setRoster(d.responders);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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
      {error && <FailureBanner title="Responder update failed" detail={error} />}
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <select
          aria-label="Verified responder"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-[56px] flex-1 rounded-xl border-2 border-zinc-200 bg-white px-3 text-lg"
        >
          {roster.map((r) => (
            <option key={r.email} value={r.email}>
              {r.name} {r.verified ? "✓ verified" : "✕ unverified"} ({r.availability})
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            post(`/api/incidents/${incidentId}/assign`, {
              responderEmail: email,
              idempotencyKey: `web-${Date.now()}`,
            })
          }
          className="min-h-[56px] rounded-xl bg-[#7F1D1D] px-5 text-lg font-bold text-white hover:bg-[#651414] disabled:opacity-50"
        >
          Assign
        </button>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {initial.length === 0 && (
          <li className="text-lg text-zinc-600">
            No responders assigned. Only verified responders receive alerts with minimum necessary details.
          </li>
        )}
        {initial.map((a) => (
          <li key={a.id} className="rounded-xl border border-zinc-200 bg-white p-3 text-lg">
            <span className="font-semibold">{a.responderName}</span> — <strong>{a.state}</strong>
            {a.state === "PENDING" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => post(`/api/assignments/${a.id}/ack`)}
                className="ml-2 rounded-lg border border-zinc-300 px-3 py-2 text-base font-semibold"
              >
                Acknowledge
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
