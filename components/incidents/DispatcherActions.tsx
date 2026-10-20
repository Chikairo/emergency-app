"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { IncidentStatus } from "@/modules/incidents/status";

interface DispatcherActionsProps {
  incidentId: string;
  status: IncidentStatus;
  onStatusChange?: (status: IncidentStatus) => void;
}

export function DispatcherActions({
  incidentId,
  status,
  onStatusChange,
}: DispatcherActionsProps) {
  const router = useRouter();
  const [vehicle, setVehicle] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<"available" | "dispatch" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleAction(decision: "available" | "dispatch" | "decline") {
    if (decision === "decline" && reason.trim().length === 0) {
      setError("Add a short reason before recording that no ambulance is available.");
      return;
    }
    setPending(decision);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/incidents/${incidentId}/ambulance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          vehicle: vehicle.trim() || "Ambulance service",
          ...(decision === "decline" ? { note: reason.trim() } : {}),
          idempotencyKey: `ops-${incidentId}-${decision}-v1`,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        incident?: { status: IncidentStatus };
      };
      if (!response.ok || !data.incident) {
        throw new Error(data.error ?? "Could not record this dispatch decision.");
      }
      onStatusChange?.(data.incident.status);
      if (decision === "available") {
        setMessage("Ambulance availability recorded. Dispatch has not been confirmed.");
      } else if (decision === "dispatch") {
        setMessage("Dispatch confirmation recorded by the dispatcher.");
      } else {
        setMessage("No ambulance availability recorded. The consultation option remains available.");
      }
      if (!onStatusChange) router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record this dispatch decision.");
    } finally {
      setPending(null);
    }
  }

  const dispatched = ["DISPATCHED_ACCEPTED", "EN_ROUTE", "ARRIVED"].includes(status);
  const availabilityConfirmed = status === "ACKNOWLEDGED";

  return (
    <section className="mt-4 rounded-xl border border-[#e7edf4] bg-[#f8fafc] p-4" aria-label="Dispatch controls">
      <h3 className="text-sm font-bold text-[#142b43]">Ambulance dispatch decision</h3>
      <p className="mt-1 text-sm text-[#5b7286]">
        {dispatched
          ? "Dispatch is confirmed by an authorized dispatcher."
          : availabilityConfirmed
            ? "Ambulance availability is confirmed. It has not been marked dispatched."
            : "Record availability first. A separate dispatch confirmation is required."}
      </p>

      {error && <p role="alert" className="mt-3 text-sm font-semibold text-[#c51f2b]">{error}</p>}
      {message && <p role="status" className="mt-3 text-sm font-semibold text-[#16875f]">{message}</p>}

      {!dispatched && (
        <>
          <label className="mt-3 block text-xs font-semibold text-[#42576c]" htmlFor={`vehicle-${incidentId}`}>
            Ambulance or provider
          </label>
          <input
            id={`vehicle-${incidentId}`}
            value={vehicle}
            onChange={(event) => setVehicle(event.target.value)}
            maxLength={60}
            placeholder="Name of the ambulance secured"
            className="mt-1 min-h-10 w-full rounded-lg border border-[#d8e0e9] bg-white px-3 text-sm text-[#17283c]"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {!availabilityConfirmed && (
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => void handleAction("available")}
                className="min-h-10 rounded-lg bg-[#3978d5] px-4 text-sm font-bold text-white disabled:opacity-60"
              >
                {pending === "available" ? "Recording…" : "Record ambulance available"}
              </button>
            )}
            {availabilityConfirmed && (
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => void handleAction("dispatch")}
                className="min-h-10 rounded-lg bg-[#ed343b] px-4 text-sm font-bold text-white disabled:opacity-60"
              >
                {pending === "dispatch" ? "Confirming…" : "Confirm dispatch"}
              </button>
            )}
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => void handleAction("decline")}
              className="min-h-10 rounded-lg border border-[#c51f2b] bg-white px-4 text-sm font-bold text-[#c51f2b] disabled:opacity-60"
            >
              {pending === "decline" ? "Recording…" : "No ambulance available"}
            </button>
          </div>
          <label className="mt-3 block text-xs font-semibold text-[#42576c]" htmlFor={`reason-${incidentId}`}>
            Reason if unavailable
          </label>
          <input
            id={`reason-${incidentId}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={300}
            placeholder="Brief reason for the decision"
            className="mt-1 min-h-10 w-full rounded-lg border border-[#d8e0e9] bg-white px-3 text-sm text-[#17283c]"
          />
        </>
      )}
    </section>
  );
}
