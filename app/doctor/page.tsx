import Link from "next/link";
import { StatusPill } from "@/components/ui/StatusPill";
import { AutoRefresh } from "@/components/coordination/AutoRefresh";
import { requirePageRoles } from "@/lib/auth-server";
import { MEDICAL_READ_ROLES } from "@/lib/authz";
import { apiGet } from "@/lib/server-api";
import type { IncidentRecord } from "@/modules/incidents/repository";

export const instant = false;

// Doctor and care-team incident list: medical, hospital, and dispatch
// roles only (redirects to sign-in otherwise). Read-only; all actions
// happen on the incident page under the same authorization rules.
export default async function DoctorPage() {
  await requirePageRoles(MEDICAL_READ_ROLES);
  const { incidents } = await apiGet<{ incidents: IncidentRecord[] }>("/api/incidents");
  const open = incidents.filter(
    (i) => i.status !== "COMPLETED_HANDED_OVER" && i.status !== "CANCELLED",
  );

  return (
    <div className="flex flex-col gap-5">
      <AutoRefresh />
      <div>
        <h1 className="text-3xl font-bold">Doctor incidents</h1>
        <p className="mt-1 text-lg text-zinc-600">
          {open.length} open report(s). Open one to review details, confirm ambulance
          availability, or coordinate care. Availability here is mock unless a dispatcher
          confirms a real vehicle.
        </p>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm" aria-label="Open reports">
        <h2 className="text-2xl font-bold">Open reports</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {open.length === 0 && (
            <li className="text-lg text-zinc-600">No open reports right now.</li>
          )}
          {open.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 p-3">
              <Link href={`/incidents/${i.id}`} className="text-xl font-semibold text-[#5B1414] underline">
                {i.emergencyType}
              </Link>
              <StatusPill status={i.status} />
              <span className="text-base text-zinc-500">
                {new Date(i.createdAt).toLocaleString()} · {i.urgency ?? "not assessed"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
