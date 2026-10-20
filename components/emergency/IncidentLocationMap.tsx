"use client";

import { useState } from "react";
import { incidentMapEmbedUrl } from "@/modules/incidents/map";

export function IncidentLocationMap({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) {
  const [mapRequested, setMapRequested] = useState(false);
  const hasLocation =
    latitude !== null &&
    longitude !== null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-[#e7edf4] bg-white text-left shadow-sm">
      <div className="flex items-center gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-xl" aria-hidden="true">
          📍
        </span>
        <div className="min-w-0">
          <h2 className="font-bold text-[#142b43]">Your shared location</h2>
          <p className="text-sm text-[#607086]">
            {hasLocation
              ? "Location shared with dispatch."
              : "Location is not available yet. Staff can confirm it with you."}
          </p>
        </div>
      </div>
      {hasLocation && (
        <>
          {mapRequested ? (
            <iframe
              title="Map of the shared emergency location"
              src={incidentMapEmbedUrl(latitude, longitude)}
              referrerPolicy="no-referrer"
              loading="lazy"
              className="h-56 w-full border-0 sm:h-64"
            />
          ) : (
            <button
              type="button"
              onClick={() => setMapRequested(true)}
              className="mx-4 mb-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#f0f5fb] px-4 text-sm font-bold text-[#275da8] hover:bg-[#e3edf8]"
            >
              Show map
            </button>
          )}
          <p className="px-4 pb-3 text-xs leading-relaxed text-[#607086]">
            Loading the map shares this location with OpenStreetMap. This demo does not provide
            live ambulance GPS tracking.
          </p>
        </>
      )}
    </section>
  );
}
