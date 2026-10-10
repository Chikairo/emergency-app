"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ContactFallback } from "@/components/ui/ContactFallback";
import { FailureBanner } from "@/components/ui/FailureBanner";

export function MarkSentButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function markSent() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/incidents/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "REQUEST_SENT",
          note: "User tapped contact (mock — no real service reached).",
          idempotencyKey: `web-${Date.now()}`,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Status was not updated.");
      setNotice("Marked as request sent. This does not mean help was dispatched.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status was not updated.");
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
      <button
        type="button"
        disabled={busy}
        onClick={markSent}
        className="mt-2 min-h-[56px] rounded-xl bg-[#7F1D1D] px-6 text-xl font-bold text-white hover:bg-[#651414] disabled:opacity-50"
      >
        I called for help (record it)
      </button>
      <div className="mt-3">
        <ContactFallback />
      </div>
    </div>
  );
}
