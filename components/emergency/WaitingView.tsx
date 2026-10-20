"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  DECLINED_COPY,
  WAITING_COPY,
  canConsult,
  waitingPhaseFor,
  type WaitingPhase,
} from "@/modules/incidents/waiting";
import type { IncidentStatus } from "@/modules/incidents/status";
import { ContactFallback } from "@/components/ui/ContactFallback";
import { IncidentLocationMap } from "@/components/emergency/IncidentLocationMap";

interface WaitingEvent {
  to: string;
  source: string | null;
}

interface DispatchSummary {
  state: string;
  simulated: boolean;
}

// Minimal post-tap waiting screen. Everything shown comes from
// server-confirmed state polled every few seconds; the client never
// invents progress. No triage, guidance catalogue, or dashboard here.
export function WaitingView({
  incidentId,
  initial,
}: {
  incidentId: string;
  initial: {
    status: IncidentStatus;
    emergencyType: string;
    location: { latitude: number | null; longitude: number | null } | null;
    events: WaitingEvent[];
  };
}) {
  const router = useRouter();
  const hasInitialLocation =
    typeof initial.location?.latitude === "number" &&
    typeof initial.location?.longitude === "number";
  const [status, setStatus] = useState<IncidentStatus>(initial.status);
  const [location, setLocation] = useState(initial.location);
  const [lastSource, setLastSource] = useState<string | null>(
    initial.events.length > 0 ? (initial.events[initial.events.length - 1]?.source ?? null) : null,
  );
  const [declined, setDeclined] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [geoAvailable] = useState(
    () => typeof navigator !== "undefined" && !!navigator.geolocation,
  );
  const [locating, setLocating] = useState(!hasInitialLocation && geoAvailable);
  const [locFailed, setLocFailed] = useState(!hasInitialLocation && !geoAvailable);
  const sentRef = useRef(false);
  const locatedRef = useRef(false);

  // Move a fresh report to SENT exactly once (idempotent server-side).
  useEffect(() => {
    if (sentRef.current || initial.status !== "REQUEST_STARTED") return;
    sentRef.current = true;
    void fetch(`/api/incidents/${incidentId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "REQUEST_SENT", idempotencyKey: `waiting-mark-sent` }),
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId]);

  // Best-effort location attach. Never blocks the flow; staff confirm
  // details with the user when positioning is unavailable.
  useEffect(() => {
    if (locatedRef.current || hasInitialLocation || !geoAvailable) return;
    locatedRef.current = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void fetch(`/api/incidents/${incidentId}/location`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            addressText: null,
            landmark: null,
            locationState: "approximate",
          }),
        })
          .then((response) => {
            if (!response.ok) throw new Error("Location could not be shared with dispatch.");
            setLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
            setLocFailed(false);
          })
          .catch(() => setLocFailed(true))
          .finally(() => setLocating(false));
      },
      () => {
        setLocating(false);
        setLocFailed(true);
      },
      { timeout: 10000, maximumAge: 60000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId]);

  // Truthful polling: advance only on server-confirmed dispatch.
  useEffect(() => {
    let stopped = false;
    async function poll() {
      try {
        const [incidentRes, dispatchRes] = await Promise.all([
          fetch(`/api/incidents/${incidentId}`, { cache: "no-store" }),
          fetch(`/api/incidents/${incidentId}/dispatch`, { cache: "no-store" }),
        ]);
        if (!incidentRes.ok) throw new Error("status unavailable");
        const { incident } = (await incidentRes.json()) as {
          incident: {
            status: IncidentStatus;
            events: WaitingEvent[];
            location: { latitude: number | null; longitude: number | null } | null;
          };
        };
        const { dispatches } = (await dispatchRes.json().catch(() => ({ dispatches: [] }))) as {
          dispatches: DispatchSummary[];
        };
        if (stopped) return;
        setReconnecting(false);
        setStatus(incident.status);
        setLocation(incident.location);
        const last = incident.events[incident.events.length - 1];
        setLastSource(last?.source ?? null);
        setDeclined(
          dispatches.some((d) => d.state === "DECLINED") &&
            !dispatches.some((d) => d.state === "ACCEPTED" && !d.simulated),
        );
        if (canConsult(incident.status, last?.source ?? null, false)) {
          router.push(`/incidents/${incidentId}/consult`);
        }
      } catch {
        if (!stopped) setReconnecting(true);
      }
    }
    void poll();
    const timer = window.setInterval(poll, 4000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId]);

  const phase: WaitingPhase = waitingPhaseFor(status, lastSource);
  const copy = WAITING_COPY[phase];
  const consultFallback = declined && canConsult(status, lastSource, true);

  const phaseConfig: Record<WaitingPhase, { icon: string; color: string; dot: string }> = {
    sent: { icon: "📋", color: "text-amber-600 bg-amber-50 border-amber-200", dot: "bg-amber-500" },
    acknowledged: {
      icon: "👂",
      color: "text-blue-600 bg-blue-50 border-blue-200",
      dot: "bg-blue-500",
    },
    dispatched: { icon: "🚑", color: "text-green-600 bg-green-50 border-green-200", dot: "bg-green-500" },
    unconfirmed: {
      icon: "⚠️",
      color: "text-orange-600 bg-orange-50 border-orange-200",
      dot: "bg-orange-500",
    },
    closed: { icon: "✅", color: "text-green-600 bg-green-50 border-green-200", dot: "bg-green-500" },
  };

  const pc = phaseConfig[phase];

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center gap-4 py-8 text-center sm:py-10">
      <p className="text-xs font-bold tracking-widest text-[#dc2626] sm:text-sm">EMERGENCY · LIVE STATUS</p>
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${pc.dot} shadow-sm`} aria-hidden="true">
        {pc.icon}
      </span>
      <h1 className="text-3xl font-bold leading-tight text-[#17283c] sm:text-4xl">{copy.headline}</h1>
      <p className="max-w-md text-base leading-7 text-slate-700 sm:text-xl sm:leading-8" role="status">
        {copy.status}
      </p>
      <p className="max-w-md text-sm text-slate-600 sm:text-base">Please stay on this screen.</p>
      {locating && (
        <p className="text-sm text-slate-500" role="status">
          Locating you to share with dispatch…
        </p>
      )}
      {locFailed && (
        <p className="max-w-md text-sm text-slate-600">
          Location could not be shared. Staff can confirm details with you.
        </p>
      )}
      {reconnecting && (
        <p className="max-w-md text-sm font-semibold text-amber-900" role="alert">
          Connection lost — retrying to get the latest status.
        </p>
      )}
      <IncidentLocationMap
        latitude={location?.latitude ?? null}
        longitude={location?.longitude ?? null}
      />
      <div className="flex w-full flex-col items-center gap-3">
        <ContactFallback compact />
        <p className="max-w-md text-xs text-slate-500">
          Ambulance dispatch and vehicle tracking are simulated in this demo. No live ambulance
          location is available.
        </p>
      </div>
      {consultFallback && (
        <div className="mt-2 flex flex-col items-center gap-3">
          <p className="max-w-md text-sm text-slate-700">{DECLINED_COPY}</p>
          <Link
            href={`/incidents/${incidentId}/consult`}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#dc2626] px-5 text-base font-bold text-white sm:min-h-[56px] sm:px-6 sm:text-lg"
          >
            Continue to consultation
          </Link>
        </div>
      )}
      {phase === "closed" && (
        <Link
          href="/"
          className="mt-2 inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-[#dc2626] px-5 text-base font-bold text-[#dc2626] sm:min-h-[56px] sm:px-6 sm:text-lg"
        >
          Start a new report
        </Link>
      )}
    </div>
  );
}
