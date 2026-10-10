import { notFound } from "next/navigation";
import { GuidanceStep } from "@/components/ui/GuidanceStep";
import { StatusPill } from "@/components/ui/StatusPill";
import { LocationForm } from "@/components/incidents/LocationForm";
import { MarkSentButton } from "@/components/incidents/MarkSentButton";
import { incidentStore } from "@/lib/incident-store";
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
  // DB-free dev read: same-process store. The Prisma adapter serves this
  // read once a database is available.
  const incident = incidentStore.getIncident(id);
  if (!incident) notFound();

  const slug = /bleed/i.test(incident.emergencyType) ? "sample-bleeding" : "sample-choking";
  const guidance = getBundle(slug);

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
        <h2 className="text-2xl font-bold">Location</h2>
        <p className="mt-1 text-lg text-zinc-600">
          Current: {incident.location?.landmark ?? incident.location?.locationState ?? "not set"}.
          Automatic detection is mocked — add a landmark to help responders later.
        </p>
        <div className="mt-2">
          <LocationForm id={incident.id} />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold">Contact help</h2>
        <MarkSentButton id={incident.id} />
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
    </div>
  );
}
