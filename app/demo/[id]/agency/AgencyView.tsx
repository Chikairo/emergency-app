"use client";

import { useState } from "react";
import { AgencyControls } from "@/components/demo/AgencyControls";
import { DemoTimeline } from "@/components/demo/Timeline";
import { VanMap } from "@/components/demo/VanMap";
import { useDemo } from "@/components/demo/useDemo";
import { DEMO_DESTINATIONS } from "@/modules/demo/geo";

export function AgencyView({ id, token }: { id: string; token: string }) {
  const { demo, loading, error, act, refresh } = useDemo(id, token ?? "");
  const [doctorNote, setDoctorNote] = useState("");
  const [logged, setLogged] = useState(false);

  if (!token) {
    return <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-lg text-amber-900" role="alert">
      This agency link is missing its access token. Open the full link from the demo launch page.
    </p>;
  }
  if (loading) return <p className="text-xl">Loading demo…</p>;
  if (error || !demo) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-lg text-amber-900" role="alert">
          {error ?? "Demo session unavailable."}
        </p>
        <button
          type="button"
          onClick={refresh}
          className="min-h-[56px] rounded-xl border-2 border-[#7F1D1D] px-6 text-xl font-bold text-[#7F1D1D]"
        >
          Retry
        </button>
      </div>
    );
  }

  const destination = DEMO_DESTINATIONS.find((d) => d.id === demo.destination);

  async function logDoctorContact() {
    const ok = await act("doctor-contacted", doctorNote || undefined);
    if (ok) {
      setLogged(true);
      setDoctorNote("");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl bg-[#2B0A0A] p-4 text-white" role="note" aria-label="Demo mode notice">
        <p className="text-xl font-bold">DEMO MODE — SIMULATED EMERGENCY · AGENCY</p>
        <p className="mt-1 text-base text-red-100">
          Incident {demo.id.slice(0, 8)} · {destination?.label} · status {demo.status} · {demo.progress}%
        </p>
      </div>

      {demo.status === "CLOSED" ? (
        <p className="rounded-2xl bg-white p-5 text-xl shadow-sm" role="status">
          This demo has ended.
        </p>
      ) : (
        <>
          <AgencyControls demo={demo} act={act} />
          <VanMap
            progress={demo.progress}
            destinationLabel={destination?.label ?? "destination"}
            moving={demo.status === "EN_ROUTE" && demo.progress < 100}
          />
          <section className="rounded-2xl bg-white p-5 shadow-sm" aria-label="Doctor coordination">
            <h2 className="text-2xl font-bold">Doctor coordination</h2>
            <p className="mt-1 text-base text-zinc-600">
              Log a simulated doctor contact for the timeline. This does not place any real call.
            </p>
            <label htmlFor="doctornote" className="mt-2 block text-lg font-semibold">
              Note <span className="font-normal text-zinc-500">(optional)</span>
            </label>
            <input
              id="doctornote"
              value={doctorNote}
              onChange={(e) => setDoctorNote(e.target.value)}
              placeholder="e.g. Doctor Adaeze briefed"
              maxLength={300}
              className="mt-1 min-h-[56px] w-full rounded-xl border-2 border-zinc-200 bg-white px-4 text-xl text-zinc-900 placeholder:text-zinc-500"
            />
            <button
              type="button"
              onClick={logDoctorContact}
              className="mt-3 min-h-[56px] rounded-xl bg-[#0E7C3E] px-6 text-xl font-bold text-white"
            >
              Log doctor contacted (simulated)
            </button>
            {(logged || demo.doctorContacted) && (
              <p className="mt-2 text-lg text-green-900" role="status">
                Doctor contact logged on the timeline (simulated).
              </p>
            )}
          </section>
        </>
      )}
      <DemoTimeline events={demo.events} />
    </div>
  );
}
