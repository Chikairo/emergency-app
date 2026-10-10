import Link from "next/link";
import { StatusPill } from "@/components/ui/StatusPill";
import { incidentStore } from "@/lib/incident-store";

export const instant = false;

// Operations view: all local reports with failed handoffs surfaced first.
// Dev-only: no RBAC yet — authorisation lands with the auth increment.
export default async function OpsPage() {
  const incidents = incidentStore.listIncidents();
  const needsAttention = incidents.filter((i) =>
    ["UNABLE_TO_CONFIRM", "REQUEST_SENT"].includes(i.status),
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-bold">Operations</h1>
        <p className="mt-1 text-lg text-zinc-600">
          {incidents.length} report(s). {needsAttention.length} need attention (sent but unconfirmed).
        </p>
      </div>

      {needsAttention.length > 0 && (
        <section className="rounded-2xl border-2 border-[#B45309] bg-amber-50 p-5" aria-label="Needs attention">
          <h2 className="text-2xl font-bold text-amber-900">⚠ Needs attention</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {needsAttention.map((i) => (
              <li key={i.id} className="text-lg">
                <Link href={`/incidents/${i.id}`} className="font-semibold text-amber-900 underline">
                  {i.emergencyType}
                </Link>{" "}
                <span className="text-amber-800">
                  — {i.status} · {new Date(i.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-sm" aria-label="All reports">
        <h2 className="text-2xl font-bold">All reports</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {incidents.length === 0 && (
            <li className="text-lg text-zinc-600">No reports yet. File one from the home page.</li>
          )}
          {incidents.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 p-3">
              <Link href={`/incidents/${i.id}`} className="text-xl font-semibold text-[#5B1414] underline">
                {i.emergencyType}
              </Link>
              <StatusPill status={i.status} />
              <span className="text-base text-zinc-500">
                {new Date(i.createdAt).toLocaleString()} · {i.events.length} event(s)
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
