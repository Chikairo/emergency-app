import { markerPosition } from "@/modules/demo/geo";

// Stylized route visualization: Yaba staging point to demo destination.
// Abstract illustration — explicitly not GPS telemetry.
export function VanMap({
  progress,
  destinationLabel,
  moving,
}: {
  progress: number;
  destinationLabel: string;
  moving: boolean;
}) {
  const pos = markerPosition(progress);
  const x = 10 + (pos / 100) * 80; // percent across the viewBox
  return (
    <figure className="rounded-xl border border-zinc-200 bg-white p-4" aria-label="Simulated van route map">
      <svg viewBox="0 0 100 40" className="h-40 w-full" role="img" aria-label={`Simulated van at ${Math.round(pos)} percent of the route`}>
        <path
          d="M10 30 C 30 30, 35 10, 55 12 S 80 22, 90 12"
          fill="none"
          stroke="#7F1D1D"
          strokeWidth="2"
          strokeDasharray="4 2"
        />
        <circle cx="10" cy="30" r="3" fill="#2B0A0A" />
        <text x="10" y="38" fontSize="5" textAnchor="middle" fill="#2B0A0A">Yaba staging</text>
        <circle cx="90" cy="12" r="3" fill="#0E7C3E" />
        <text x="90" y="22" fontSize="5" textAnchor="middle" fill="#2B0A0A">{destinationLabel}</text>
        <g>
          <rect x={x - 4} y={14} width="8" height="6" rx="1.5" fill="#C81E1E" stroke="#2B0A0A" />
          <text x={x} y={12} fontSize="5" textAnchor="middle" fill="#2B0A0A">van</text>
        </g>
      </svg>
      <figcaption className="mt-1 text-base text-zinc-600">
        Illustrative route ({Math.round(pos)}%). {moving ? "Simulated van moving." : "Van holding position."} Not real GPS.
      </figcaption>
    </figure>
  );
}
