"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { DispatcherActions } from "@/components/incidents/DispatcherActions";
import type { IncidentStatus } from "@/modules/incidents/status";
import { detectNewIds, markSeen, sectionFor } from "@/modules/ops/queue";

export interface OpsIncident {
  id: string;
  emergencyType: string;
  status: IncidentStatus;
  createdAt: string | Date;
  location: {
    addressText: string | null;
    landmark: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

interface DispatchSummary {
  id: string;
  state: string;
  targetName: string;
  simulated: boolean;
  updatedAt: string | Date;
}

type QueueFilter = "all" | "incoming" | "awaiting" | "dispatched" | "declined";

const FILTERS: { key: QueueFilter; title: string }[] = [
  { key: "all", title: "All incidents" },
  { key: "incoming", title: "Incoming" },
  { key: "awaiting", title: "Awaiting verification" },
  { key: "dispatched", title: "Dispatched" },
  { key: "declined", title: "Declined / unavailable" },
];

function locationLine(location: OpsIncident["location"]): string {
  if (!location) return "Location pending";
  if (location.addressText) return location.addressText;
  if (location.landmark) return `Near ${location.landmark}`;
  if (location.latitude !== null && location.longitude !== null) {
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  }
  return "Location pending";
}

function statusLabel(status: IncidentStatus): string {
  switch (status) {
    case "REQUEST_STARTED":
      return "Alert received";
    case "REQUEST_SENT":
      return "Availability being checked";
    case "ACKNOWLEDGED":
      return "Ambulance available — dispatch pending";
    case "DISPATCHED_ACCEPTED":
      return "Dispatch confirmed";
    case "EN_ROUTE":
      return "En route";
    case "ARRIVED":
      return "Arrived";
    case "UNABLE_TO_CONFIRM":
      return "Unavailable / needs review";
    case "CANCELLED":
      return "Declined / cancelled";
    case "COMPLETED_HANDED_OVER":
      return "Completed";
  }
}

function statusStyle(status: IncidentStatus): string {
  if (["DISPATCHED_ACCEPTED", "EN_ROUTE", "ARRIVED"].includes(status)) {
    return "bg-blue-100 text-blue-900";
  }
  if (status === "ACKNOWLEDGED") return "bg-emerald-100 text-emerald-900";
  if (status === "UNABLE_TO_CONFIRM" || status === "CANCELLED") {
    return "bg-orange-100 text-orange-900";
  }
  return "bg-amber-100 text-amber-900";
}

function filterMatches(filter: QueueFilter, incident: OpsIncident): boolean {
  if (filter === "all") return true;
  if (filter === "declined") {
    return incident.status === "UNABLE_TO_CONFIRM" || incident.status === "CANCELLED";
  }
  if (filter === "incoming") {
    return incident.status === "REQUEST_STARTED" || incident.status === "REQUEST_SENT";
  }
  return sectionFor(incident.status) === filter;
}

function receivedAt(value: string | Date): string {
  return `${new Date(value).toLocaleString("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })} UTC`;
}

function isIncoming(status: IncidentStatus): boolean {
  return status === "REQUEST_STARTED" || status === "REQUEST_SENT";
}

export function OpsQueue({
  initial,
  staffEmail,
  isSystemAdmin,
}: {
  initial: OpsIncident[];
  staffEmail: string;
  isSystemAdmin: boolean;
}) {
  const router = useRouter();
  const storageKey = `emergency-ops-alerts:${staffEmail}`;
  const [incidents, setIncidents] = useState(initial);
  const [alerts, setAlerts] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as
        | { known?: unknown; unseen?: unknown }
        | null;
      const known = Array.isArray(saved?.known)
        ? saved.known.filter((id): id is string => typeof id === "string")
        : [];
      const unseen = Array.isArray(saved?.unseen)
        ? saved.unseen.filter((id): id is string => typeof id === "string")
        : [];
      const presentIds = new Set(initial.map((incident) => incident.id));
      const initialUnread = saved
        ? []
        : initial.filter((incident) => isIncoming(incident.status)).map((incident) => incident.id);
      const restored = [...new Set([...unseen.filter((id) => presentIds.has(id)), ...initialUnread])];
      localStorage.setItem(
        storageKey,
        JSON.stringify({ known: [...new Set([...known, ...initial.map((incident) => incident.id)])], unseen: restored }),
      );
      return restored;
    } catch {
      return initial.filter((incident) => isIncoming(incident.status)).map((incident) => incident.id);
    }
  });
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [selectedId, setSelectedId] = useState(initial[0]?.id ?? "");
  const [dispatches, setDispatches] = useState<DispatchSummary[]>([]);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const knownRef = useRef<string[]>(initial.map((incident) => incident.id));
  const inFlightRef = useRef(false);

  const selected = incidents.find((incident) => incident.id === selectedId) ?? incidents[0] ?? null;
  const visibleIncidents = useMemo(
    () => incidents.filter((incident) => filterMatches(filter, incident)),
    [filter, incidents],
  );
  const counts = useMemo(
    () => ({
      active: incidents.filter((incident) =>
        ["REQUEST_STARTED", "REQUEST_SENT", "ACKNOWLEDGED", "DISPATCHED_ACCEPTED", "EN_ROUTE", "ARRIVED"].includes(
          incident.status,
        ),
      ).length,
      incoming: incidents.filter((incident) => isIncoming(incident.status)).length,
      awaiting: incidents.filter((incident) => incident.status === "ACKNOWLEDGED").length,
      dispatched: incidents.filter((incident) =>
        ["DISPATCHED_ACCEPTED", "EN_ROUTE", "ARRIVED"].includes(incident.status),
      ).length,
    }),
    [incidents],
  );

  const acknowledge = useCallback(
    (id: string) => {
      setAlerts((previous) => {
        const next = markSeen(previous, id);
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({ known: knownRef.current, unseen: next }),
          );
        } catch {
          // In-memory acknowledgement still works when browser storage is unavailable.
        }
        return next;
      });
    },
    [storageKey],
  );

  useEffect(() => {
    let stopped = false;
    async function pollQueue() {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const response = await fetch("/api/incidents", { cache: "no-store" });
        if (!response.ok) throw new Error("Could not refresh the incident queue.");
        const body = (await response.json()) as { incidents: OpsIncident[] };
        if (stopped) return;
        setIncidents(body.incidents);
        setQueueError(null);
        const fresh = detectNewIds(knownRef.current, body.incidents);
        if (fresh.length > 0) {
          knownRef.current = [...knownRef.current, ...fresh];
          setAlerts((previous) => {
            const next = [...new Set([...previous, ...fresh])];
            try {
              localStorage.setItem(
                storageKey,
                JSON.stringify({ known: knownRef.current, unseen: next }),
              );
            } catch {
              // Queue refresh and in-app alerting do not depend on browser storage.
            }
            return next;
          });
        }
      } catch (error) {
        if (!stopped) {
          setQueueError(
            error instanceof Error ? error.message : "Queue refresh failed. Showing the last received list.",
          );
        }
      } finally {
        inFlightRef.current = false;
      }
    }
    void pollQueue();
    const timer = window.setInterval(() => void pollQueue(), 5000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [initial, storageKey]);

  useEffect(() => {
    if (!selected) return;
    let stopped = false;
    async function refreshDispatches() {
      try {
        const response = await fetch(`/api/incidents/${selected.id}/dispatch`, { cache: "no-store" });
        if (!response.ok) throw new Error("Dispatch records are temporarily unavailable.");
        const body = (await response.json()) as { dispatches: DispatchSummary[] };
        if (!stopped) setDispatches(body.dispatches);
      } catch {
        if (!stopped) setDispatches([]);
      }
    }
    void refreshDispatches();
    const timer = window.setInterval(() => void refreshDispatches(), 8000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [selected?.id, selected]);

  async function signOut() {
    setSigningOut(true);
    setSignOutError(null);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message);
      router.push("/sign-in");
      router.refresh();
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Could not sign out.");
      setSigningOut(false);
    }
  }

  function updateSelectedStatus(status: IncidentStatus) {
    setIncidents((previous) =>
      previous.map((incident) => (incident.id === selected?.id ? { ...incident, status } : incident)),
    );
    setDispatches((previous) => {
      if (status === "ACKNOWLEDGED") {
        return [
          ...previous,
          {
            id: `availability-${selected?.id ?? ""}`,
            state: "ACKNOWLEDGED",
            targetName: "Ambulance service",
            simulated: false,
            updatedAt: new Date(),
          },
        ];
      }
      if (["DISPATCHED_ACCEPTED", "EN_ROUTE", "ARRIVED"].includes(status)) {
        return [
          ...previous,
          {
            id: `dispatch-${selected?.id ?? ""}`,
            state: "ACCEPTED",
            targetName: "Ambulance service",
            simulated: false,
            updatedAt: new Date(),
          },
        ];
      }
      return previous;
    });
  }

  const latestDispatch = dispatches.at(-1);
  const availabilityNote =
    latestDispatch?.state === "DECLINED"
      ? `${latestDispatch.targetName}: unavailable — consultation remains available.`
      : latestDispatch?.state === "ACCEPTED" && !latestDispatch.simulated
        ? `${latestDispatch.targetName}: dispatch confirmed by authorized staff.`
        : latestDispatch?.state === "ACKNOWLEDGED" && !latestDispatch.simulated
          ? `${latestDispatch.targetName}: availability confirmed; dispatch is not confirmed.`
          : selected
            ? statusLabel(selected.status)
            : "";

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#17283c]">
      <div className="min-h-screen lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden bg-[#142b43] p-5 text-[#dce7f2] lg:flex lg:flex-col">
          <Link href="/ops" className="mb-8 flex items-center gap-2 text-lg font-extrabold text-white">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#ed343b] text-xl">✚</span>
            FirstLink
          </Link>
          <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9bb0c5]">
            Operations
          </p>
          <nav className="grid gap-1" aria-label="Dispatch navigation">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="rounded-lg border-l-4 border-[#ed343b] bg-[#29435d] px-3 py-3 text-left text-sm font-bold text-white"
            >
              ▦ &nbsp; Dispatch overview
            </button>
            {FILTERS.slice(1).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className="rounded-lg px-3 py-3 text-left text-sm text-[#d3deea] hover:bg-[#203a54]"
              >
                {item.title}
              </button>
            ))}
          </nav>
          <p className="mt-auto text-xs leading-5 text-[#9bb0c5]">
            Dispatch decisions are recorded by authorized staff. Availability alone does not mean an ambulance has departed.
          </p>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex min-h-[70px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#e7edf4] bg-white px-4 py-3 shadow-sm sm:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#ed343b] text-xl text-white lg:hidden">✚</span>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#c51f2b]">
                  Dispatch Control Centre
                </p>
                <h1 className="text-base font-extrabold leading-tight text-[#142b43] sm:text-xl">Emergency response queue</h1>
              </div>
            </div>
            <div className="flex items-center gap-3 max-[400px]:w-full max-[400px]:justify-end">
              {isSystemAdmin && (
                <Link
                  href="/ops/staff"
                  className="inline-flex min-h-10 items-center rounded-lg border border-[#d8e0e9] bg-white px-3 text-sm font-bold text-[#142b43] hover:bg-[#f5f7fb]"
                >
                  Staff access
                </Link>
              )}
              <div className="hidden text-right sm:block">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#718096]">Signed in as</p>
                <p className="max-w-52 truncate text-sm font-bold text-[#142b43]">{staffEmail}</p>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                disabled={signingOut}
                className="min-h-10 rounded-lg border border-[#d8e0e9] bg-white px-3 text-sm font-bold text-[#142b43] hover:bg-[#f5f7fb] disabled:opacity-60"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </header>

          <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 p-4 pb-24 sm:p-7">
            {signOutError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{signOutError}</p>}
            {queueError && (
              <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                {queueError} The last received queue remains visible; automatic retry continues.
              </p>
            )}

            {alerts.length > 0 && (
              <section className="flex flex-col gap-3 rounded-xl border-2 border-[#ed343b] bg-[#fff0f0] p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ed343b] text-xl text-white">!</span>
                  <div>
                    <p className="text-sm font-extrabold tracking-wide text-[#c51f2b]">
                      NEW EMERGENCY REQUEST RECEIVED{alerts.length > 1 ? ` · ${alerts.length} new` : ""}
                    </p>
                    <p className="mt-1 text-sm text-[#7f1d1d]">
                      Server-confirmed incoming request. Review its details and location below.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const id = alerts[0];
                    if (!id) return;
                    setSelectedId(id);
                    setFilter("all");
                    acknowledge(id);
                  }}
                  className="min-h-11 shrink-0 rounded-lg bg-[#ed343b] px-4 text-sm font-extrabold text-white hover:bg-[#c51f2b]"
                >
                  Review new request
                </button>
              </section>
            )}

            <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Live queue totals">
              {[
                { title: "Active incidents", value: counts.active, detail: "Open response records", color: "text-[#142b43]" },
                { title: "Incoming alerts", value: counts.incoming, detail: `${alerts.length} unopened`, color: "text-[#c51f2b]" },
                { title: "Availability confirmed", value: counts.awaiting, detail: "Dispatch not yet confirmed", color: "text-[#16875f]" },
                { title: "Dispatch confirmed", value: counts.dispatched, detail: "Authorized staff recorded", color: "text-[#275da8]" },
              ].map((stat) => (
                <article key={stat.title} className="rounded-xl border border-[#e7edf4] bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold text-[#718096]">{stat.title}</p>
                  <p className={`mt-2 text-3xl font-black ${stat.color}`}>{stat.value}</p>
                  <p className="mt-1 text-[11px] text-[#718096]">{stat.detail}</p>
                </article>
              ))}
            </section>

            <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.85fr)]">
              <section className="min-w-0 overflow-hidden rounded-xl border border-[#e7edf4] bg-white shadow-sm" aria-label="Incoming emergency queue">
                <div className="flex flex-col gap-3 border-b border-[#e7edf4] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-[#142b43]">Incoming emergency queue</h2>
                    <p className="mt-1 text-xs text-[#718096]">Latest server status and location. Refreshes automatically.</p>
                  </div>
                  <span className="w-fit rounded-full bg-[#e8f8f1] px-3 py-1 text-[10px] font-extrabold text-[#16875f]">LIVE · 5 SEC</span>
                </div>
                <div className="flex gap-2 overflow-x-auto border-b border-[#e7edf4] px-4 py-3" role="tablist" aria-label="Filter incidents">
                  {FILTERS.map((item) => {
                    const count = incidents.filter((incident) => filterMatches(item.key, incident)).length;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        role="tab"
                        aria-selected={filter === item.key}
                        onClick={() => setFilter(item.key)}
                        className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${
                          filter === item.key
                            ? "bg-[#142b43] text-white"
                            : "bg-[#f0f3f7] text-[#607086] hover:bg-[#e7edf4]"
                        }`}
                      >
                        {item.title} <span className="ml-1 opacity-75">{count}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                    <thead className="bg-[#f8fafc] text-[10px] uppercase tracking-wide text-[#718096]">
                      <tr>
                        <th className="px-4 py-3">Incident</th>
                        <th className="px-4 py-3">Received</th>
                        <th className="px-4 py-3">Available location</th>
                        <th className="px-4 py-3">Server status</th>
                        <th className="px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleIncidents.map((incident) => {
                        const isNew = alerts.includes(incident.id);
                        const isSelected = selected?.id === incident.id;
                        return (
                          <tr
                            key={incident.id}
                            onClick={() => {
                              setSelectedId(incident.id);
                              acknowledge(incident.id);
                            }}
                            className={`cursor-pointer border-t border-[#edf1f5] ${
                              isNew ? "bg-[#fff0f0]" : isSelected ? "bg-[#f0f6ff]" : "bg-white"
                            } hover:bg-[#f8fafc]`}
                          >
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                {isNew && <span className="rounded-full bg-[#ed343b] px-2 py-1 text-[9px] font-black text-white">NEW</span>}
                                <span className="font-extrabold text-[#142b43]">#{incident.id.slice(0, 8).toUpperCase()}</span>
                              </div>
                              <p className="mt-1 max-w-44 truncate text-[#718096]">{incident.emergencyType}</p>
                            </td>
                            <td className="px-4 py-4 text-[#42576c]">{receivedAt(incident.createdAt)}</td>
                            <td className="max-w-52 truncate px-4 py-4 text-[#42576c]">{locationLine(incident.location)}</td>
                            <td className="px-4 py-4">
                              <span className={`inline-block rounded-full px-2.5 py-1.5 font-extrabold ${statusStyle(incident.status)}`}>
                                {statusLabel(incident.status)}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedId(incident.id);
                                  acknowledge(incident.id);
                                }}
                                className="font-extrabold text-[#275da8] underline underline-offset-2"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {visibleIncidents.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#718096]">
                            No incidents in this queue.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <aside className="min-w-0">
                {selected ? (
                  <section className="rounded-xl border border-[#e7edf4] bg-white p-4 shadow-sm" aria-label="Selected incident details">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#c51f2b]">Selected incident</p>
                        <h2 className="mt-1 text-lg font-extrabold text-[#142b43]">#{selected.id.slice(0, 8).toUpperCase()}</h2>
                      </div>
                      {alerts.includes(selected.id) && (
                        <span className="rounded-full bg-[#ed343b] px-2.5 py-1 text-[9px] font-black text-white">NEW</span>
                      )}
                    </div>
                    <p className="mt-3 text-sm font-bold text-[#17283c]">{selected.emergencyType}</p>
                    <p className="mt-1 text-xs text-[#718096]">Received {receivedAt(selected.createdAt)}</p>

                    <div className="mt-4 rounded-lg bg-[#f8fafc] p-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#718096]">Available location</p>
                      <p className="mt-1 text-sm font-semibold text-[#17283c]">{locationLine(selected.location)}</p>
                      {selected.location?.latitude !== null && selected.location?.latitude !== undefined &&
                        selected.location.longitude !== null && selected.location.longitude !== undefined && (
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${selected.location.latitude}&mlon=${selected.location.longitude}#map=16/${selected.location.latitude}/${selected.location.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-xs font-bold text-[#275da8] underline"
                          >
                            View coordinates on map
                          </a>
                        )}
                    </div>

                    <div className="mt-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#718096]">Server-confirmed status</p>
                      <p className="mt-1 text-sm font-bold text-[#17283c]">{availabilityNote}</p>
                      <p className="mt-1 text-xs text-[#718096]">{statusLabel(selected.status)}</p>
                    </div>

                    <DispatcherActions
                      incidentId={selected.id}
                      status={selected.status}
                      onStatusChange={updateSelectedStatus}
                    />

                    <Link
                      href={`/incidents/${selected.id}`}
                      onClick={() => acknowledge(selected.id)}
                      className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[#d8e0e9] bg-white px-4 text-sm font-extrabold text-[#142b43] hover:bg-[#f5f7fb]"
                    >
                      Open incident details
                    </Link>
                    <p className="mt-3 text-[11px] text-[#718096]">
                      Consultation status and professional call controls are available in the incident record.
                    </p>
                  </section>
                ) : (
                  <section className="rounded-xl border border-[#e7edf4] bg-white p-8 text-center shadow-sm">
                    <h2 className="font-extrabold text-[#142b43]">No incident selected</h2>
                    <p className="mt-2 text-sm text-[#718096]">Incoming emergencies will appear here as soon as the server confirms them.</p>
                  </section>
                )}
              </aside>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
