"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FailureBanner } from "@/components/ui/FailureBanner";
import type { DispatchRecord } from "@/modules/coordination/store";

export function DispatchPanel({
  incidentId,
  initial,
}: {
  incidentId: string;
  initial: DispatchRecord[];
}) {
  const router = useRouter();
  const [targetName, setTargetName] = useState("Mock Ambulance Co.");
  const [targetType, setTargetType] = useState("ambulance-partner");
  const [vehicle, setVehicle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function post(url: string, body?: unknown) {
    setBusy(true);
    setError(null);
    setNotice(null);
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

  async function decide(decision: "confirm" | "decline") {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/ambulance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          vehicle: vehicle.trim() || undefined,
          idempotencyKey: `web-${Date.now()}`,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed.");
      setNotice(
        decision === "confirm"
          ? "Ambulance confirmed by you. The patient view now shows vehicle on the way."
          : "Availability declined and recorded. The request stays open for reconsideration.",
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <FailureBanner title="Dispatch update failed" detail={error} />}
      {notice && (
        <div role="status" className="mb-3 rounded-xl border border-green-300 bg-green-50 p-4 text-lg text-green-900">
          {notice}
        </div>
      )}
      <div className="rounded-xl border-2 border-[#0E7C3E] bg-green-50/50 p-4">
        <p className="text-xl font-bold text-green-900">Real availability decision</p>
        <p className="mt-1 text-base text-zinc-600">
          Confirming records a genuine dispatcher decision (not simulated) and advances the
          incident status. Only confirm a vehicle you have actually secured.
        </p>
        <label htmlFor="vehicle" className="mt-2 block text-lg font-semibold">
          Vehicle or service name <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <input
          id="vehicle"
          value={vehicle}
          onChange={(e) => setVehicle(e.target.value)}
          placeholder="e.g. Ambulance A12"
          maxLength={60}
          className="mt-1 min-h-[56px] w-full rounded-xl border-2 border-zinc-200 bg-white px-4 text-lg text-zinc-900 placeholder:text-zinc-500"
        />
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => decide("confirm")}
            className="min-h-[56px] rounded-xl bg-[#0E7C3E] px-5 text-xl font-bold text-white disabled:opacity-50"
          >
            Confirm ambulance
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => decide("decline")}
            className="min-h-[56px] rounded-xl border-2 border-[#C81E1E] px-5 text-xl font-bold text-[#C81E1E] disabled:opacity-50"
          >
            Decline — no vehicle
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <label htmlFor="dtarget" className="text-lg font-semibold">Partner to request (mock)</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            id="dtype"
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className="min-h-[56px] rounded-xl border-2 border-zinc-200 bg-white px-3 text-lg"
          >
            <option value="ambulance-partner">Ambulance partner</option>
            <option value="emergency-service">Emergency service</option>
          </select>
          <input
            id="dtarget"
            value={targetName}
            onChange={(e) => setTargetName(e.target.value)}
            maxLength={120}
            className="min-h-[56px] flex-1 rounded-xl border-2 border-zinc-200 bg-white px-4 text-lg text-zinc-900 placeholder:text-zinc-500"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              post(`/api/incidents/${incidentId}/dispatch`, {
                targetType,
                targetName,
                idempotencyKey: `web-${Date.now()}`,
              })
            }
            className="min-h-[56px] rounded-xl bg-[#7F1D1D] px-5 text-lg font-bold text-white hover:bg-[#651414] disabled:opacity-50"
          >
            Send request
          </button>
        </div>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {initial.length === 0 && (
          <li className="text-lg text-zinc-600">No dispatch requests yet. Sending records SENT — never dispatched.</li>
        )}
        {initial.map((d) => (
          <li key={d.id} className="rounded-xl border border-zinc-200 bg-white p-3 text-lg">
            <span className="font-semibold">{d.targetName}</span>{" "}
            <span className="text-zinc-600">({d.targetType})</span> — <strong>{d.state}</strong>
            {d.simulated && <span className="text-zinc-500"> (simulated)</span>}
            <span className="ml-2 flex flex-wrap gap-2">
              {d.state === "SENT" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => post(`/api/dispatch/${d.id}/ack`)}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-base font-semibold"
                >
                  Simulate ack
                </button>
              )}
              {d.state === "ACKNOWLEDGED" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => post(`/api/dispatch/${d.id}/confirm`)}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-base font-semibold"
                >
                  Simulate dispatch
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
