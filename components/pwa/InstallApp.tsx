"use client";

import { useEffect, useState } from "react";

export function InstallApp() {
  const [deferred, setDeferred] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    if (!deferred) {
      setShowInstructions((previous) => !previous);
      return;
    }
    const prompt = deferred as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(
        choice.outcome === "accepted"
          ? "Installation started."
          : "Installation was cancelled.",
      );
      setDeferred(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Could not open the install prompt: ${error.message}`
          : "Could not open the install prompt.",
      );
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 px-4 py-5" aria-label="Install the app">
      <button
        type="button"
        onClick={() => void install()}
        aria-expanded={showInstructions}
        aria-controls="install-instructions"
        disabled={installed}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#d8e0e9] bg-white px-5 text-sm font-bold text-[#142b43] shadow-sm transition hover:border-[#ed343b] hover:text-[#c51f2b] disabled:cursor-default disabled:opacity-70"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
          <path d="M10 1.5a1 1 0 0 1 1 1v7.09l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42L9 9.59V2.5a1 1 0 0 1 1-1ZM3 13a1 1 0 0 1 1 1v2h12v-2a1 1 0 1 1 2 0v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z" />
        </svg>
        {installed ? "App installed" : "Install app"}
      </button>
      {message && <p className="text-xs text-[#607086]" role="status">{message}</p>}
      {showInstructions && !installed && (
        <p id="install-instructions" className="max-w-md text-center text-xs text-[#607086]">
          If no install prompt appears, use your browser menu and choose “Install app” or “Add to
          Home Screen”. On iPhone, use Share → Add to Home Screen.
        </p>
      )}
      {installed && (
        <p className="text-center text-xs text-[#607086]" role="status">
          Open Emergency Care from your home screen. Emergency requests still require a connection.
        </p>
      )}
    </div>
  );
}
