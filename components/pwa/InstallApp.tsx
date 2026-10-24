"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallPlatform = "ios" | "android" | "desktop";

function detectInstallPlatform(): InstallPlatform {
  const userAgent = window.navigator.userAgent;
  const isAppleMobile =
    /iPhone|iPad|iPod/i.test(userAgent) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  if (isAppleMobile) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}

export function InstallApp() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("desktop");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
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
    setPlatform(detectInstallPlatform());
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      setShowInstructions(false);
      return;
    }
    if (!deferred) {
      setShowInstructions((previous) => !previous);
      return;
    }
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
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
    <div className="flex flex-col items-center gap-2 px-4 py-5" aria-label="Install FirstLink">
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
        {installed ? "FirstLink installed" : "Install FirstLink"}
      </button>
      {message && <p className="text-xs text-[#607086]" role="status">{message}</p>}
      {showInstructions && !installed && (
        <div id="install-instructions" className="max-w-md text-center text-xs leading-relaxed text-[#607086]">
          {platform === "ios" ? (
            <p>
              Open this page in Safari, tap <strong>Share</strong>, choose{" "}
              <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
            </p>
          ) : platform === "android" ? (
            <>
              <p>
                Choose <strong>Install</strong> in the prompt, or open your browser menu and tap
                <strong> Install app</strong> or <strong>Add to Home screen</strong>.
              </p>
              <p className="mt-1">
                Prefer the Android beta app?{" "}
                <a
                  href="https://github.com/Chikairo/emergency-app/releases/download/android-v0.1.3/emergency-care-android.apk"
                  className="font-semibold text-[#275da8] underline"
                  rel="noreferrer"
                  target="_blank"
                >
                  Download the APK
                </a>
                .
              </p>
            </>
          ) : (
            <p>
              Choose <strong>Install</strong> in the prompt, or use your browser menu or address-bar
              install icon to install FirstLink on this computer.
            </p>
          )}
          <p className="mt-1">
            FirstLink installs from this website; no app-store account is needed. An internet
            connection is required to send emergency requests.
          </p>
        </div>
      )}
      {installed && (
        <p className="text-center text-xs text-[#607086]" role="status">
          Open FirstLink from your home screen. Emergency requests still require a connection.
        </p>
      )}
    </div>
  );
}
