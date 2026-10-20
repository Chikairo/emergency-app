"use client";

import { useState } from "react";
import type { DemoView } from "./useDemo";

// Agency-only controls. Every action is idempotent and timestamped on the
// timeline; destructive reset asks first.
export function AgencyControls({
  demo,
  act,
}: {
  demo: DemoView;
  act: (action: string, note?: string) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  async function run(action: string, note?: string) {
    setBusy(true);
    try {
      await act(action, note);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm" aria-label="Agency controls">
      <h2 className="text-2xl font-bold">Agency controls</h2>

      {(demo.status === "AVAILABILITY_REQUESTED" || demo.status === "DECLINED") && (
        <>
          <p className="mt-2 text-xl font-semibold" role="status">
            Emergency van required. Is a response vehicle available?
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => run("approve")}
              className="min-h-[72px] rounded-2xl bg-[#0E7C3E] px-6 text-2xl font-bold text-white disabled:opacity-50"
            >
              YES — DISPATCH VAN
            </button>
            <button
              type="button"
              disabled={busy || demo.status === "DECLINED"}
              onClick={() => run("decline")}
              className="min-h-[72px] rounded-2xl border-2 border-[#C81E1E] px-6 text-2xl font-bold text-[#C81E1E] disabled:opacity-50"
            >
              NO — NO VAN AVAILABLE
            </button>
          </div>
          {demo.status === "DECLINED" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run("reconsider")}
              className="mt-3 min-h-[56px] rounded-xl border-2 border-zinc-300 px-5 text-xl font-semibold"
            >
              Reconsider availability
            </button>
          )}
        </>
      )}

      {demo.status === "EN_ROUTE" && (
        <>
          <p className="mt-2 text-lg text-zinc-700" role="status">
            Simulated van en route ({demo.progress}%). Advance manually for a deterministic demo.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => run("advance")}
              className="min-h-[56px] rounded-xl bg-[#7F1D1D] px-5 text-xl font-bold text-white hover:bg-[#651414] disabled:opacity-50"
            >
              Advance journey (+25%)
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run("arrive")}
              className="min-h-[56px] rounded-xl bg-[#0E7C3E] px-5 text-xl font-bold text-white disabled:opacity-50"
            >
              Mark vehicle arrived
            </button>
          </div>
        </>
      )}

      {demo.status === "ARRIVED" && (
        <p className="mt-2 text-xl font-bold text-green-900" role="status">
          Arrival confirmed. The demo journey is complete.
        </p>
      )}

      <div className="mt-4 border-t border-zinc-200 pt-3">
        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="min-h-[48px] rounded-xl border border-zinc-300 px-4 text-lg font-semibold text-zinc-700"
          >
            End demo
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold">End this demo for both screens?</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setConfirmReset(false);
                run("reset");
              }}
              className="min-h-[48px] rounded-xl bg-zinc-900 px-4 text-lg font-bold text-white disabled:opacity-50"
            >
              Yes, end it
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="min-h-[48px] rounded-xl border border-zinc-300 px-4 text-lg font-semibold"
            >
              Keep going
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
