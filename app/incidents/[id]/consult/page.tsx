import { notFound, redirect } from "next/navigation";
import { ConsultView } from "@/components/emergency/ConsultView";
import { ApiError, apiGet } from "@/lib/server-api";
import { getPageUser } from "@/lib/auth-server";
import { CALL_DOCTOR_ROLES } from "@/lib/authz";
import { canConsult, isDispatchConfirmed } from "@/modules/incidents/waiting";

export const instant = false;

// Consultation is reachable only on server-confirmed dispatch (or the
// no-ambulance fallback). Direct visits without confirmation bounce back
// to the waiting screen — the client never self-authorizes entry.
export default async function ConsultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getPageUser();
  let incident: {
    status: Parameters<typeof isDispatchConfirmed>[0];
    emergencyType: string;
    events: { to: string; source: string | null }[];
  };
  let declined = false;
  try {
    ({ incident } = await apiGet<{ incident: typeof incident }>(`/api/incidents/${id}`));
    const { dispatches } = await apiGet<{
      dispatches: { state: string; simulated: boolean }[];
    }>(`/api/incidents/${id}/dispatch`);
    declined =
      dispatches.some((d) => d.state === "DECLINED") &&
      !dispatches.some((d) => d.state === "ACCEPTED" && !d.simulated);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const last = incident.events[incident.events.length - 1];
  const lastSource = last?.source ?? null;
  if (!canConsult(incident.status, lastSource, declined)) {
    redirect(`/incidents/${id}/waiting`);
  }
  return (
    <ConsultView
      incidentId={id}
      emergencyType={incident.emergencyType}
      ambulanceOnWay={isDispatchConfirmed(incident.status, lastSource)}
      isStaff={Boolean(
        user && (CALL_DOCTOR_ROLES as readonly string[]).includes(user.role),
      )}
    />
  );
}
