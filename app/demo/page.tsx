"use client";

import { useState } from "react";
import { DEMO_DESTINATIONS } from "@/modules/demo/geo";

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `web-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

// Demo launch pad. Creates a uniquely identified demo session and hands
// out two separate role links: open the patient link here, the agency link
// on a second browser or device.
export default function DemoLaunchPage() {
  const [destination, setDestination] = useState(DEMO_DESTINATIONS[0]?.id ?? "demo-hospital-ikeja");
  const [links, setLinks] = useState<{ patientUrl: string; agencyUrl: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function launch() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, idempotencyKey: newKey() }),
      });
      const data = (await res.json()) as {
        demo?: { patientUrl: string; agencyUrl: string };
        error?: string;
      };
      if (!res.ok || !data.demo) throw new Error(data.error ?? "Demo could not start.");
      setLinks(data.demo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Demo could not start.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl bg-[#2B0A0A] p-5 text-white" role="note" aria-label="Demo mode notice">
        <p className="text-2xl font-bold">DEMO MODE — SIMULATED EMERGENCY</p>
        <p className="mt-1 text-lg text-red-100">
          Nothing here dispatches a real vehicle or contacts real services. For rehearsal only.
        </p>
      </div>

      <h1 className="text-3xl font-bold">Start a demo emergency</h1>

      {error && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-lg text-amber-900" role="alert">
          {error}
        </p>
      )}

      {!links ? (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <label htmlFor="dest" className="text-xl font-bold">Demo destination</label>
          <select
            id="dest"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="mt-2 min-h-[56px] w-full rounded-xl border-2 border-zinc-200 bg-white px-3 text-xl"
          >
            {DEMO_DESTINATIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label} — {d.area}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending}
            onClick={launch}
            className="mt-4 min-h-[64px] w-full rounded-2xl bg-[#C81E1E] px-8 text-2xl font-bold text-white shadow-lg hover:bg-[#A61717] disabled:opacity-50"
          >
            {pending ? "Starting…" : "Start demo emergency"}
          </button>
          <p className="mt-2 text-base text-zinc-600">
            The van starts at the Yaba staging point after the agency approves dispatch.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <a
            href={links.patientUrl}
            className="flex min-h-[64px] items-center justify-center rounded-2xl bg-[#7F1D1D] px-6 text-2xl font-bold text-white"
          >
            Open patient view (this device)
          </a>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xl font-bold">Agency view (second browser or device)</p>
            <p className="mt-1 text-base text-zinc-600">
              Open this link where the agency role will act. Keep the two links separate —
              each grants only its own role.
            </p>
            <p className="mt-2 break-all rounded-xl bg-zinc-100 p-3 font-mono text-base">
              {links.agencyUrl}
            </p>
            <a
              href={links.agencyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-[56px] items-center rounded-xl border-2 border-[#7F1D1D] px-6 text-xl font-bold text-[#7F1D1D]"
            >
              Open agency view in a new tab
            </a>
          </div>
          <button
            type="button"
            onClick={() => setLinks(null)}
            className="min-h-[48px] rounded-xl border border-zinc-300 px-4 text-lg font-semibold text-zinc-700"
          >
            Start a different demo
          </button>
        </div>
      )}
    </div>
  );
}
