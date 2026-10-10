import type { IncidentStatus } from "@/modules/incidents/status";

const LABELS: Record<IncidentStatus, { label: string; icon: string; classes: string }> = {
  REQUEST_STARTED: { label: "Request started", icon: "○", classes: "bg-zinc-100 text-zinc-900 border-zinc-300" },
  REQUEST_SENT: { label: "Request sent — not yet confirmed", icon: "◔", classes: "bg-amber-50 text-amber-900 border-amber-300" },
  ACKNOWLEDGED: { label: "Acknowledged", icon: "◑", classes: "bg-blue-50 text-blue-900 border-blue-300" },
  DISPATCHED_ACCEPTED: { label: "Dispatched / accepted", icon: "◕", classes: "bg-blue-100 text-blue-900 border-blue-400" },
  EN_ROUTE: { label: "En route", icon: "→", classes: "bg-indigo-50 text-indigo-900 border-indigo-300" },
  ARRIVED: { label: "Arrived", icon: "◎", classes: "bg-teal-50 text-teal-900 border-teal-300" },
  COMPLETED_HANDED_OVER: { label: "Completed / handed over", icon: "●", classes: "bg-green-50 text-green-900 border-green-400" },
  UNABLE_TO_CONFIRM: { label: "Unable to confirm", icon: "?", classes: "bg-orange-50 text-orange-900 border-orange-400" },
  CANCELLED: { label: "Cancelled", icon: "✕", classes: "bg-zinc-100 text-zinc-600 border-zinc-300" },
};

export function StatusPill({ status }: { status: IncidentStatus }) {
  const meta = LABELS[status];
  return (
    <span
      role="status"
      aria-label={meta.label}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-base font-semibold ${meta.classes}`}
    >
      <span aria-hidden="true">{meta.icon}</span>
      {meta.label}
    </span>
  );
}
