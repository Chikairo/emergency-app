import Link from "next/link";
import { notFound } from "next/navigation";
import { DispatcherActions } from "@/components/incidents/DispatcherActions";
import { IncidentLocationMap } from "@/components/emergency/IncidentLocationMap";
import { ContactFallback } from "@/components/ui/ContactFallback";
import { StatusPill } from "@/components/ui/StatusPill";
import { getPageUser } from "@/lib/auth-server";
import { DISPATCH_ROLES } from "@/lib/authz";
import { apiGet } from "@/lib/server-api";
import { canConsult, DECLINED_COPY, isDispatchConfirmed } from "@/modules/incidents/waiting";
import type { DispatchRecord } from "@/modules/coordination/store";
import type { IncidentRecord } from "@/modules/incidents/repository";

export const instant = false;

export default async function IncidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getPageUser();
  let incident: IncidentRecord;
  try {
    ({ incident } = await apiGet<{ incident: IncidentRecord }>(`/api/incidents/${id}`));
  } catch (error) {
    const e = error as { status?: number };
    if (e.status === 404) notFound();
    throw error;
  }

  const dispatches = (
    await apiGet<{ dispatches: DispatchRecord[] }>(`/api/incidents/${id}/dispatch`)
  ).dispatches;
  const dispatcher = Boolean(user && (DISPATCH_ROLES as readonly string[]).includes(user.role));
  const latestEvent = incident.events.at(-1);
  const lastSource = latestEvent?.source ?? null;
  const dispatchConfirmed = isDispatchConfirmed(incident.status, lastSource);
  const closed =
    incident.status === "COMPLETED_HANDED_OVER" || incident.status === "CANCELLED";
  const declined =
    dispatches.some((dispatch) => dispatch.state === "DECLINED") &&
    !dispatches.some((dispatch) => dispatch.state === "ACCEPTED" && !dispatch.simulated);
  const consultationAvailable =
    !closed && canConsult(incident.status, lastSource, declined);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-8 sm:gap-5">
      <section className="overflow-hidden rounded-3xl bg-[#142b43] text-white shadow-lg">
        <div className="flex flex-col gap-5 p-5 sm:p-7 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-200">
              Emergency request
            </p>
            <h1 className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl">
              {incident.emergencyType}
            </h1>
            <p className="mt-2 text-sm text-blue-100">
              Ref {id.slice(0, 8)} <span aria-hidden="true">·</span>{" "}
              Received {new Date(incident.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
            <StatusPill status={incident.status} />
            <p className="text-sm font-semibold text-blue-100" role="status">
              {incident.status === "ARRIVED"
                ? "The ambulance has arrived."
                : dispatchConfirmed
                ? "Ambulance is on the way."
                : declined
                  ? "No ambulance is available. Consultation remains available."
                  : incident.status === "ACKNOWLEDGED"
                    ? "Availability confirmed; dispatch is not yet confirmed."
                    : closed
                      ? "This emergency request is closed."
                      : "Emergency alert sent; dispatch is checking availability."}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] md:gap-5">
        <IncidentLocationMap
          latitude={incident.location?.latitude ?? null}
          longitude={incident.location?.longitude ?? null}
        />

        <section
          className="flex flex-col justify-between gap-4 rounded-2xl border border-[#e7edf4] bg-white p-5 shadow-sm sm:p-6"
          aria-labelledby="consultation-heading"
        >
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#c51f2b]">
              Professional care
            </p>
            <h2 id="consultation-heading" className="mt-2 text-xl font-extrabold text-[#142b43]">
              Connect with a medical professional
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#607086]">
              {consultationAvailable
                ? "Choose a voice or video consultation. Your camera stays off unless you choose video."
                : "The consultation option becomes available after dispatch is confirmed, or if no ambulance is available."}
            </p>
          </div>
          {consultationAvailable ? (
            <Link
              href={`/incidents/${id}/consult`}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#c51f2b] px-5 text-base font-bold text-white transition-colors hover:bg-[#a81924] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c51f2b]"
            >
              Open consultation
            </Link>
          ) : (
            <p className="rounded-xl bg-[#f3f6fa] p-3 text-sm font-semibold text-[#40556d]">
              {declined ? DECLINED_COPY : "Please stay on the waiting screen for status updates."}
            </p>
          )}
          <Link
            href={`/incidents/${id}/waiting`}
            className="text-center text-sm font-semibold text-[#275da8] underline underline-offset-2"
          >
            View emergency status
          </Link>
        </section>
      </div>

      <section className="rounded-2xl border border-[#e7edf4] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-[#142b43]">Ambulance response</h2>
            <p className="mt-1 text-sm text-[#607086]">
              Availability and confirmed dispatch are separate updates.
            </p>
          </div>
          <span className="text-sm font-bold text-[#40556d]">
            {dispatchConfirmed
              ? "Dispatch confirmed"
              : declined
                ? "Unavailable"
                : "Awaiting dispatch update"}
          </span>
        </div>
        {dispatches.length > 0 && (
          <ul className="mt-4 grid gap-2">
            {dispatches.map((dispatch) => (
              <li
                key={dispatch.id}
                className="flex flex-col gap-1 rounded-xl border border-[#e7edf4] bg-[#f8fafc] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-bold text-[#142b43]">{dispatch.targetName}</span>
                <span className="text-sm text-[#52657b]">
                  {dispatch.state === "ACCEPTED" && !dispatch.simulated
                    ? "Dispatch confirmed"
                    : dispatch.state === "ACCEPTED"
                      ? "Availability recorded (simulated)"
                      : dispatch.state === "DECLINED"
                        ? "Unavailable"
                        : `${dispatch.state.toLowerCase()}${dispatch.simulated ? " · simulated" : ""}`}
                </span>
              </li>
            ))}
          </ul>
        )}
        {dispatcher && <DispatcherActions incidentId={id} status={incident.status} />}
      </section>

      <section
        className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5"
        aria-label="Emergency services fallback"
      >
        <p className="text-sm font-bold text-amber-950">Need immediate help?</p>
        <div className="mt-2 text-sm text-amber-950">
          <ContactFallback compact />
        </div>
      </section>

      {incident.events.length > 0 && (
        <details className="rounded-2xl border border-[#e7edf4] bg-white p-5 shadow-sm">
          <summary className="cursor-pointer text-sm font-bold text-[#142b43]">
            Incident updates ({incident.events.length})
          </summary>
          <ol className="mt-4 grid gap-3">
            {incident.events.map((event) => (
              <li
                key={event.id}
                className="flex flex-col gap-1 border-l-2 border-[#d8e2ee] pl-3 sm:flex-row sm:items-center sm:gap-3"
              >
                <time className="text-xs text-[#607086]">
                  {new Date(event.at).toLocaleString()}
                </time>
                <span className="text-sm font-semibold text-[#243b53]">
                  {event.from ?? "Request"} → {event.to.replaceAll("_", " ").toLowerCase()}
                </span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </main>
  );
}
