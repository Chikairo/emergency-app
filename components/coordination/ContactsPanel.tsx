"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FailureBanner } from "@/components/ui/FailureBanner";
import type { ContactRecord } from "@/modules/coordination/store";

export function ContactsPanel({
  incidentId,
  initial,
}: {
  incidentId: string;
  initial: ContactRecord[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const keyCounter = useRef(0);

  async function sendWhatsApp(contactId: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    // Unique per tap, generated in the event handler (never during render).
    keyCounter.current += 1;
    const idempotencyKey = `web-${incidentId}-${contactId}-${keyCounter.current}`;
    try {
      const res = await fetch(`/api/incidents/${incidentId}/notify-whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, idempotencyKey }),
      });
      const data = (await res.json()) as {
        error?: string;
        notification?: { state: string };
      };
      if (!res.ok) throw new Error(data.error ?? "Request failed.");
      setNotice(
        data.notification?.state === "SENT"
          ? "WhatsApp alert accepted by the provider (SENT — delivery not confirmed)."
          : (data.error ?? "WhatsApp alert was not delivered."),
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function post(url: string, body?: unknown) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json()) as { error?: string; notifications?: unknown[] };
      if (!res.ok) throw new Error(data.error ?? "Request failed.");
      if (data.notifications) {
        setNotice(
          `Notified ${data.notifications.length} contact(s) via mock channel (SENT — delivery not confirmed).`,
        );
      }
      setName("");
      setAddress("");
      setConsent(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <FailureBanner title="Contact update failed" detail={error} />}
      {notice && (
        <div role="status" className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-lg text-amber-900">
          {notice}
        </div>
      )}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input
          aria-label="Contact name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          maxLength={120}
          className="min-h-[56px] rounded-xl border-2 border-zinc-200 bg-white px-4 text-lg text-zinc-900 placeholder:text-zinc-500"
        />
        <input
          aria-label="Phone or email"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Phone or email"
          maxLength={160}
          className="min-h-[56px] rounded-xl border-2 border-zinc-200 bg-white px-4 text-lg text-zinc-900 placeholder:text-zinc-500"
        />
      </div>
      <label className="mt-2 flex min-h-[48px] items-center gap-3 text-lg">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="h-6 w-6 accent-[#7F1D1D]"
        />
        I have consent to share progress updates with this contact.
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !consent}
          onClick={() =>
            consent &&
            post(`/api/incidents/${incidentId}/contacts`, {
              name: name || "Trusted contact",
              channel: "SMS",
              address,
              consent,
            })
          }
          className="min-h-[56px] rounded-xl bg-[#7F1D1D] px-5 text-lg font-bold text-white hover:bg-[#651414] disabled:opacity-50"
        >
          Add contact
        </button>
        <button
          type="button"
          disabled={busy || initial.length === 0}
          onClick={() => post(`/api/incidents/${incidentId}/notify`)}
          className="min-h-[56px] rounded-xl border-2 border-[#7F1D1D] px-5 text-lg font-bold text-[#7F1D1D] disabled:opacity-50"
        >
          Notify contacts (mock)
        </button>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {initial.map((c) => (
          <li key={c.id} className="rounded-xl border border-zinc-200 bg-white p-3 text-lg">
            <span className="font-semibold">{c.name}</span>{" "}
            <span className="text-zinc-600">
              ({c.channel}) · consent {new Date(c.consentAt).toLocaleTimeString()}
              {c.lastDelivery ? ` · last: ${c.lastDelivery}` : " · not yet notified"}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => sendWhatsApp(c.id)}
              className="ml-2 rounded-lg border border-zinc-300 px-3 py-2 text-base font-semibold"
            >
              WhatsApp alert
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
