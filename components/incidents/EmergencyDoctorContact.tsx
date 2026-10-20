"use client";

import { useEffect, useState } from "react";

interface DoctorContact {
  configured: boolean;
  display?: string;
  telHref?: string;
  whatsappUrl?: string | null;
  message?: string;
}

// Emergency doctor contact: always visible, never gated on the call
// outcome. Direct tel: calling plus WhatsApp handoff when a number is
// configured; honest fallback otherwise.
export function EmergencyDoctorContact({ id }: { id: string }) {
  const [contact, setContact] = useState<DoctorContact | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/incidents/${id}/doctor-contact`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data: DoctorContact) => {
        if (!cancelled) setContact(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (failed) {
    return (
      <p className="mt-3 text-lg text-zinc-600" role="status">
        Doctor contact could not be loaded. Emergency services above remain available.
      </p>
    );
  }
  if (!contact) return null;

  if (!contact.configured) {
    return (
      <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-xl font-bold text-zinc-900">Call the doctor directly</p>
        <p className="mt-1 text-lg text-zinc-700">
          {contact.message ?? "Doctor contact is not available yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xl font-bold text-zinc-900">Call the doctor directly</p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <a
          href={contact.telHref}
          className="flex min-h-[56px] items-center justify-center rounded-xl bg-[#0E7C3E] px-4 text-xl font-bold text-white"
        >
          Call {contact.display}
        </a>
        {contact.whatsappUrl && (
          <a
            href={contact.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[56px] items-center justify-center rounded-xl border-2 border-[#0E7C3E] px-4 text-xl font-bold text-[#0E7C3E]"
          >
            WhatsApp chat
          </a>
        )}
      </div>
      {contact.message && (
        <p className="mt-2 text-base text-zinc-600">{contact.message}</p>
      )}
    </div>
  );
}
