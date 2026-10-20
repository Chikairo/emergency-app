"use client";

import { useState } from "react";
import Link from "next/link";
import { CallPanel } from "@/components/incidents/CallPanel";

// Minimal consultation choice: voice-first or video. The actual call reuses
// CallPanel (same room/token APIs and authorization); this screen only
// captures the explicit choice. Camera stays off for voice.
export function ConsultView({
  incidentId,
  emergencyType,
  ambulanceOnWay,
  isStaff,
}: {
  incidentId: string;
  emergencyType: string;
  ambulanceOnWay: boolean;
  isStaff: boolean;
}) {
  const [mode, setMode] = useState<"voice" | "video" | null>(null);

  return (
    <div className="flex min-h-screen flex-col bg-[#0f172a] text-white">
      <header className="flex items-center justify-between px-4 py-4 bg-[#0f172a]">
        <Link
          href="/"
          className="flex items-center gap-2"
          onClick={(e) => {
            e.preventDefault();
            window.history.back();
          }}
        >
          <div className="w-2 h-2 rounded-full bg-[#dc2626] animate-pulse" />
          <span className="text-xl font-bold">Emergency Care</span>
        </Link>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-3xl font-bold mb-2">Connect with a medical professional</h1>
          <p className="text-slate-300 mb-6">Report: {emergencyType}</p>
          {ambulanceOnWay && (
            <div className="inline-flex items-center gap-2 rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold text-green-400 mb-6">
              Ambulance is on the way
            </div>
          )}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setMode("voice")}
              className="min-h-[72px] rounded-2xl bg-[#dc2626] px-6 text-2xl font-bold text-white shadow-lg hover:bg-[#b91c1c]"
            >
              Voice call
            </button>
            <p className="-mt-1 text-center text-sm text-slate-400">
              Camera stays off.
            </p>
            <button
              type="button"
              onClick={() => setMode("video")}
              className="min-h-[72px] rounded-2xl border-2 border-white/30 bg-white/5 px-6 text-2xl font-bold text-white shadow-sm hover:bg-white/10"
            >
              Video call
            </button>
            <p className="-mt-1 text-center text-sm text-slate-500">
              Camera turns on only if you allow it.
            </p>
          </div>
        </div>
      </main>

      {mode !== null && (
        <div className="bg-[#0f172a]">
          <CallPanel
            key={mode}
            incidentId={incidentId}
            isStaff={isStaff}
            autoRequest
            startCameraOff={mode === "voice"}
          />
        </div>
      )}
    </div>
  );
}
