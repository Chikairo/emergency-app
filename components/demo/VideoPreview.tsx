"use client";

import { useEffect, useRef, useState } from "react";

// Clearly labelled consultation preview: a LOCAL camera preview only.
// No signalling, no provider, no remote video — never presented as connected.
export function VideoPreview({
  demoId,
  token,
  onOpened,
}: {
  demoId: string;
  token: string;
  onOpened: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // Already stopped.
        }
      });
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }, [muted]);

  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !cameraOff;
    });
  }, [cameraOff]);

  async function start() {
    setError(null);
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera preview is not supported in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setOpen(true);
      // Record that the preview was opened (patient-side info, not a connection).
      fetch(`/api/demo/${demoId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "consultation-previewed",
          token,
          idempotencyKey:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `web-${Date.now()}`,
        }),
      }).catch(() => undefined);
      onOpened();
    } catch (e) {
      setError(
        e instanceof Error && /denied|not allowed|notallowed/i.test(e.message)
          ? "Camera or microphone blocked. Allow access to preview, or continue without video."
          : e instanceof Error
            ? e.message
            : "Camera preview could not start.",
      );
    }
  }

  function close() {
    streamRef.current?.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        // Already stopped.
      }
    });
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setOpen(false);
  }

  if (!open) {
    return (
      <section className="rounded-2xl bg-white p-5 shadow-sm" aria-label="Video consultation">
        <h2 className="text-2xl font-bold">Video consultation</h2>
        <p className="mt-1 text-lg text-zinc-600">
          Opens a local camera preview so you can check your setup. This demo has no video
          provider connected.
        </p>
        <button
          type="button"
          onClick={start}
          className="mt-3 min-h-[56px] rounded-xl bg-[#7F1D1D] px-6 text-xl font-bold text-white hover:bg-[#651414]"
        >
          Start video consultation
        </button>
        {error && (
          <p className="mt-2 text-lg text-amber-900" role="alert">{error}</p>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border-2 border-[#7F1D1D] bg-white p-5 shadow-sm" aria-label="Consultation preview">
      <h2 className="text-2xl font-bold">Consultation preview — not connected</h2>
      <p className="mt-1 text-base text-zinc-600" role="status">
        Local camera only. The doctor cannot see or hear you through this preview.
      </p>
      <video ref={videoRef} muted playsInline aria-label="Local camera preview" className="mt-3 aspect-video w-full rounded-xl bg-zinc-900" />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-pressed={muted}
          className="min-h-[48px] rounded-xl border-2 border-zinc-300 px-4 text-lg font-semibold"
        >
          {muted ? "Unmute" : "Mute"}
        </button>
        <button
          type="button"
          onClick={() => setCameraOff((c) => !c)}
          aria-pressed={cameraOff}
          className="min-h-[48px] rounded-xl border-2 border-zinc-300 px-4 text-lg font-semibold"
        >
          {cameraOff ? "Camera on" : "Camera off"}
        </button>
        <button
          type="button"
          onClick={close}
          className="min-h-[48px] rounded-xl bg-zinc-900 px-4 text-lg font-bold text-white"
        >
          End preview
        </button>
      </div>
    </section>
  );
}
