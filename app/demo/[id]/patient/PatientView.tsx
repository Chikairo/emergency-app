"use client";

import { DoctorPanel } from "@/components/demo/DoctorPanel";
import { DemoTimeline } from "@/components/demo/Timeline";
import { VanMap } from "@/components/demo/VanMap";
import { VideoPreview } from "@/components/demo/VideoPreview";
import { useDemo } from "@/components/demo/useDemo";
import { StatusPill } from "@/components/ui/StatusPill";
import { DEMO_DESTINATIONS } from "@/modules/demo/geo";

function DemoBanner() {
  return (
    <div className="rounded-2xl bg-[#2B0A0A] p-4 text-white" role="note" aria-label="Demo mode notice">
      <p className="text-xl font-bold">DEMO MODE — SIMULATED EMERGENCY · PATIENT</p>
    </div>
  );
}

export function PatientView({ id, token }: { id: string; token: string }) {
  const { demo, loading, error, refresh } = useDemo(id, token ?? "");

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <DemoBanner />
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-lg text-amber-900" role="alert">
          This patient link is missing its access token. Open the full link from the demo launch page.
        </p>
      </div>
    );
  }
  if (loading) return <p className="text-xl">Loading demo…</p>;
  if (error || !demo) {
    return (
      <div className="flex flex-col gap-4">
        <DemoBanner />
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
  const ended = demo.status === "CLOSED";

  return (
    <div className="flex flex-col gap-5">
      <DemoBanner />
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-lg text-zinc-500">Simulated emergency · {destination?.label}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2" role="status" aria-live="polite">
          <StatusPill status={mapStatus(demo.status)} />
          <span className="text-lg font-semibold">
            {statusText(demo.status, demo.progress, demo.etaMinutes)}
          </span>
        </div>
      </div>

      {ended ? (
        <p className="rounded-2xl bg-white p-5 text-xl shadow-sm" role="status">
          This demo has ended. Return to the launch page to start a new one.
        </p>
      ) : (
        <>
          <VanMap
            progress={demo.progress}
            destinationLabel={destination?.label ?? "destination"}
            moving={demo.status === "EN_ROUTE" && demo.progress < 100}
          />
          <DoctorPanel demoId={demo.id} token={token} />
          <VideoPreview demoId={demo.id} token={token} onOpened={refresh} />
        </>
      )}
      <DemoTimeline events={demo.events} />
    </div>
  );
}

function mapStatus(status: string) {
  switch (status) {
    case "AVAILABILITY_REQUESTED":
      return "REQUEST_SENT" as const;
    case "DECLINED":
      return "UNABLE_TO_CONFIRM" as const;
    case "APPROVED":
      return "ACKNOWLEDGED" as const;
    case "EN_ROUTE":
      return "EN_ROUTE" as const;
    case "ARRIVED":
      return "ARRIVED" as const;
    case "CLOSED":
      return "CANCELLED" as const;
    default:
      return "REQUEST_STARTED" as const;
  }
}

function statusText(status: string, progress: number, eta: number): string {
  switch (status) {
    case "AVAILABILITY_REQUESTED":
      return "Waiting for the agency to confirm a vehicle…";
    case "DECLINED":
      return "No demo vehicle currently available. The agency may reconsider.";
    case "APPROVED":
      return "Demo van dispatched.";
    case "EN_ROUTE":
      return `Demo van en route — ${progress}% (illustrative ETA ${eta} min). Simulated.`;
    case "ARRIVED":
      return "Demo van arrived.";
    case "CLOSED":
      return "Demo ended.";
    default:
      return "Demo starting…";
  }
}
