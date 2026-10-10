import { notFound } from "next/navigation";
import { GuidanceStep } from "@/components/ui/GuidanceStep";
import { StatusPill } from "@/components/ui/StatusPill";
import { LocationForm } from "@/components/incidents/LocationForm";
import { MarkSentButton } from "@/components/incidents/MarkSentButton";
import { ClosePanel } from "@/components/coordination/ClosePanel";
import { ContactsPanel } from "@/components/coordination/ContactsPanel";
import { DispatchPanel } from "@/components/coordination/DispatchPanel";
import { MedproPanel } from "@/components/coordination/MedproPanel";
import { RespondersPanel } from "@/components/coordination/RespondersPanel";
import { VoiceTriage } from "@/components/triage/VoiceTriage";
import { isStaff } from "@/lib/authz";
import { getPageUser } from "@/lib/auth-server";
import { ApiError, apiGet } from "@/lib/server-api";
import type { AssignmentRecord, ContactRecord, DispatchRecord, MedproRecord } from "@/modules/coordination/store";
import type { IncidentRecord } from "@/modules/incidents/repository";
import { getBundle } from "@/modules/guidance/bundles";

// Incident data is per-report and uncached: allow a blocking dynamic route
// instead of static prerender (Next 16 cacheComponents default).
export const instant = false;

export default async function IncidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getPageUser();
  // Single data path through the API (never the store directly): route
  // handlers own storage, so pages work across runtimes. The API enforces
  // owner/staff/link scoping; denials read as "not found".
  let incident: IncidentRecord;
  try {
    ({ incident } = await apiGet<{ incident: IncidentRecord }>(
      `/api/incidents/${id}`,
    ));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const staff = Boolean(user && isStaff(user.role));

  const slug = /bleed/i.test(incident.emergencyType) ? "sample-bleeding" : "sample-choking";
  const guidance = getBundle(slug);
  const dispatches = staff
    ? (await apiGet<{ dispatches: DispatchRecord[] }>(`/api/incidents/${id}/dispatch`)).dispatches
    : [];
  const medpros = staff
    ? (await apiGet<{ requests: MedproRecord[] }>(`/api/incidents/${id}/medpro`)).requests
    : [];
  const assignments = staff
    ? (await apiGet<{ assignments: AssignmentRecord[] }>(`/api/incidents/${id}/assign`)).assignments
    : [];
  const contacts = (
    await apiGet<{ contacts: ContactRecord[] }>(`/api/incidents/${id}/contacts`)
  ).contacts;
  const closed =
    incident.status === "COMPLETED_HANDED_OVER" || incident.status === "CANCELLED";

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-lg text-zinc-500">Report for</p>
        <h1 className="text-3xl font-bold">{incident.emergencyType}</h1>
        <div className="mt-3">
          <StatusPill status={incident.status} />
        </div>
      </div>

      {guidance && (
        <section className="rounded-2xl bg-white p-5 shadow-sm" aria-label="Interim guidance">
          <h2 className="text-2xl font-bold">What to do right now</h2>
          <p className="mt-1 text-base text-zinc-600">
            {guidance.title} · v{guidance.version} · {guidance.status} · professional help is
            still required.
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {guidance.steps.map((s) => (
              <GuidanceStep key={s.order} step={s} />
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold">Contact help</h2>
        <p className="mt-1 text-base text-zinc-600">
          Online contact is mocked here. In a real emergency, call your local emergency number directly.
        </p>
        <div className="mt-2">
          <MarkSentButton id={incident.id} />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm" aria-label="Quick questions">
        <h2 className="text-2xl font-bold">Quick questions</h2>
        <p className="mt-1 text-base text-zinc-600">
          Optional — answer aloud or tap. Short questions only; skip anything. Current assessment:{" "}
          <strong>{incident.urgency ?? "not assessed yet"}</strong>.
        </p>
        <div className="mt-3">
          <VoiceTriage incidentId={incident.id} />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold">Location</h2>
        <p className="mt-1 text-lg text-zinc-600">
          Current: {incident.location?.landmark ?? incident.location?.locationState ?? "not set"}.
          Automatic detection is mocked — add a landmark to help responders later.
        </p>
        <div className="mt-2">
          <LocationForm id={incident.id} />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm" aria-label="Incident timeline">
        <h2 className="text-2xl font-bold">Timeline</h2>
        <ol className="mt-2 flex flex-col gap-2">
          {incident.events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 text-lg">
              <span className="font-mono text-base text-zinc-500">
                {new Date(e.at).toLocaleTimeString()}
              </span>
              <span>
                {e.from ?? "—"} → <strong>{e.to}</strong>
              </span>
              <span className="text-zinc-500">({e.source})</span>
            </li>
          ))}
        </ol>
      </section>

      {!closed && (
        <>
          {staff ? (
            <>
              <section className="rounded-2xl bg-white p-5 shadow-sm" aria-label="Dispatch coordination">
                <h2 className="text-2xl font-bold">Dispatch coordination</h2>
                <p className="mt-1 text-base text-zinc-600">
                  Mock partners only. A request is SENT until the named service confirms — never assume dispatch.
                </p>
                <div className="mt-2">
                  <DispatchPanel incidentId={incident.id} initial={dispatches} />
                </div>
              </section>

              <section className="rounded-2xl bg-white p-5 shadow-sm" aria-label="Medical professional">
                <h2 className="text-2xl font-bold">Medical professional</h2>
                <p className="mt-1 text-base text-zinc-600">
                  Mock queue. Pending means nobody connected — keep following the guidance above.
                </p>
                <div className="mt-2">
                  <MedproPanel incidentId={incident.id} initial={medpros} />
                </div>
              </section>

              <section className="rounded-2xl bg-white p-5 shadow-sm" aria-label="Nearby responders">
                <h2 className="text-2xl font-bold">Nearby responders</h2>
                <div className="mt-2">
                  <RespondersPanel incidentId={incident.id} initial={assignments} />
                </div>
              </section>
            </>
          ) : (
            <p className="rounded-2xl bg-white p-5 text-lg text-zinc-600 shadow-sm">
              Responder and dispatch coordination appear here for signed-in staff. Your report,
              guidance, and status above are unaffected.
            </p>
          )}

          <section className="rounded-2xl bg-white p-5 shadow-sm" aria-label="Trusted contacts">
            <h2 className="text-2xl font-bold">Trusted contacts</h2>
            <p className="mt-1 text-base text-zinc-600">
              Only consented contacts are notified, with minimum necessary detail.
            </p>
            <div className="mt-2">
              <ContactsPanel incidentId={incident.id} initial={contacts} />
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm" aria-label="Close incident">
            <h2 className="text-2xl font-bold">Close incident</h2>
            <div className="mt-2">
              <ClosePanel incidentId={incident.id} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
