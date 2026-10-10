"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FailureBanner } from "@/components/ui/FailureBanner";

export function LocationForm({ id }: { id: string }) {
  const router = useRouter();
  const [landmark, setLandmark] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/incidents/${id}/location`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: null,
          longitude: null,
          addressText: null,
          landmark: landmark || null,
          locationState: landmark ? "approximate" : "unavailable",
        }),
      });
      if (!res.ok) throw new Error("Location was not saved. Nothing was shared.");
      setNotice("Location saved on this device. It has not been delivered to any service.");
      setLandmark("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Location was not saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <FailureBanner title="Something failed" detail={error} />}
      {notice && (
        <div role="status" className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-lg text-amber-900">
          {notice}
        </div>
      )}
      <label htmlFor="landmark" className="mt-1 block text-lg font-semibold">
        Landmark or directions
      </label>
      <input
        id="landmark"
        value={landmark}
        onChange={(e) => setLandmark(e.target.value)}
        placeholder="e.g. Blue kiosk opposite the market"
        maxLength={300}
        className="mt-1 min-h-[56px] w-full rounded-xl border-2 border-zinc-200 px-4 text-xl"
      />
      <button
        type="button"
        disabled={busy}
        onClick={save}
        className="mt-3 min-h-[56px] rounded-xl bg-zinc-900 px-6 text-xl font-bold text-white disabled:opacity-50"
      >
        Save location
      </button>
    </div>
  );
}
