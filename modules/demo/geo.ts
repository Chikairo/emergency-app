// Stylized demo geography. Yaba, Lagos is the fixed staging area; the
// "route" is an illustrative SVG polyline, never real GPS telemetry.
// Coordinates below are abstract 0-100 map units for marker placement.

export interface DemoDestinationInfo {
  id: string;
  label: string;
  area: string;
}

export const DEMO_ORIGIN = { label: "Yaba staging point", area: "Yaba, Lagos" };

export const DEMO_DESTINATIONS: DemoDestinationInfo[] = [
  { id: "demo-hospital-ikeja", label: "Demo Hospital", area: "Ikeja (illustrative)" },
  { id: "demo-clinic-surulere", label: "Demo Clinic", area: "Surulere (illustrative)" },
  { id: "demo-centre-yaba", label: "Demo Care Centre", area: "Yaba (illustrative)" },
];

/** Illustrative full-journey duration; ETA is derived, never measured. */
export const ILLUSTRATIVE_JOURNEY_MINUTES = 12;

export function illustrativeEtaMinutes(progress: number): number {
  const clamped = Math.min(100, Math.max(0, progress));
  return Math.max(0, Math.round(((100 - clamped) / 100) * ILLUSTRATIVE_JOURNEY_MINUTES));
}

/** Marker position (percent) along the stylized route. */
export function markerPosition(progress: number): number {
  return Math.min(100, Math.max(0, progress));
}
