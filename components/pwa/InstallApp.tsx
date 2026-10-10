"use client";

import { useEffect, useState } from "react";
import { useServiceWorker } from "./RegisterSW";

// Install card for the home page: Chrome/Edge install prompt when
// available, honest fallback guidance otherwise (including iOS Safari's
// Share -> Add to Home Screen, which has no prompt API).
export function InstallApp() {
  const sw = useServiceWorker();
  const [deferred, setDeferred] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    const prompt = deferred as (Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }) | null;
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice.catch(() => undefined);
    setDeferred(null);
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm" aria-label="Install the app">
      <h2 className="text-2xl font-bold">Install the app</h2>
      {installed ? (
        <p className="mt-1 text-lg text-zinc-700" role="status">
          Installed — open it from your home screen. Saved guidance works offline; emergency
          requests still need a connection and are never sent silently.
        </p>
      ) : deferred ? (
        <>
          <p className="mt-1 text-lg text-zinc-700">
            Add Emergency Care to your home screen for one-tap access.
          </p>
          <button
            type="button"
            onClick={install}
            className="mt-3 min-h-[56px] rounded-xl bg-[#7F1D1D] px-6 text-xl font-bold text-white hover:bg-[#651414]"
          >
            Install app
          </button>
        </>
      ) : (
        <div className="mt-1 flex flex-col gap-1 text-lg text-zinc-700">
          <p>
            Android / Chrome / Edge: open the browser menu and choose{" "}
            <strong>Install app</strong> or <strong>Add to Home screen</strong>
            {sw === "ready" ? " (offline support active)." : " (open the deployed site over HTTPS)."}
          </p>
          <p>
            iPhone / Safari: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
          </p>
        </div>
      )}
    </section>
  );
}
