import { notFound } from "next/navigation";
import { WaitingView } from "@/components/emergency/WaitingView";
import { ApiError, apiGet } from "@/lib/server-api";
import type { IncidentStatus } from "@/modules/incidents/status";

export const instant = false;

// Dedicated minimal waiting screen: server-confirmed status only.
export default async function WaitingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let incident: {
    status: IncidentStatus;
    emergencyType: string;
    location: { latitude: number | null; longitude: number | null } | null;
    events: { to: string; source: string | null }[];
  };
  try {
    ({ incident } = await apiGet<{ incident: typeof incident }>(`/api/incidents/${id}`));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  return <WaitingView incidentId={id} initial={incident} />;
}
