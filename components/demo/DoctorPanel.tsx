"use client";

import { useState } from "react";

// Patient-side doctor contact: fetches a click-to-chat link on demand.
// The number is never hardcoded or logged here; the API serves it only to
// the patient role, or reports unconfigured.
export function DoctorPanel({ demoId, token }: { demoId: string; token: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadLink() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/demo/${demoId}/doctor-link?token=${encodeURIComponent(token)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as { configured?: boolean; url?: string; message?: string };
      if (!res.ok) throw new Error("Could not load the doctor contact.");
      if (!data.configured || !data.url) {
        setMessage(data.message ?? "Doctor number is not configured.");
        return;
      }
      setUrl(data.url);
      setMessage(data.message ?? null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load the doctor contact.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm" aria-label="Doctor contact">
      <h2 className="text-2xl font-bold">Doctor contact</h2>
      {!url ? (
        <>
          <p className="mt-1 text-lg text-zinc-600">
            Open a WhatsApp chat with the on-call doctor. WhatsApp opens separately.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={loadLink}
            className="mt-3 min-h-[56px] rounded-xl bg-[#0E7C3E] px-6 text-xl font-bold text-white disabled:opacity-50"
          >
            {busy ? "Loading…" : "Contact doctor on WhatsApp"}
          </button>
          {message && (
            <p className="mt-2 text-lg text-zinc-700" role="status">{message}</p>
          )}
        </>
      ) : (
        <>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex min-h-[56px] items-center justify-center rounded-xl bg-[#0E7C3E] px-6 text-xl font-bold text-white"
          >
            Open WhatsApp chat
          </a>
          {message && <p className="mt-2 text-base text-zinc-600" role="status">{message}</p>}
          <p className="mt-2 text-base text-zinc-600">
            Opening the chat does not place a call. For a voice call, use WhatsApp&apos;s own
            call button inside the chat — the platform cannot dial automatically.
          </p>
        </>
      )}
    </section>
  );
}
