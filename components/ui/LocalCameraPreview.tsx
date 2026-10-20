"use client";

import { useEffect, useRef, useState } from "react";

// Optional local camera check for the emergency flow. Local preview only:
// no signalling, no provider, no remote party — never a live consultation.
export function LocalCameraPreview() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stopAll() {
    streamRef.current?.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        // Already stopped.
      }
    });
    streamRef.current = null;
  }

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }, [muted]);

  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !cameraOff;
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
    } catch (e) {
      stopAll();
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
    stopAll();
    if (videoRef.current) videoRef.current.srcObject = null;
    setOpen(false);
  }

  return (
    <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xl font-bold text-zinc-900">
        Video consultation <span className="font-normal text-zinc-500">(optional)</span>
      </p>
      {!open ? (
        <>
          <p className="mt-1 text-base text-zinc-600">
            Check your camera and microphone with a local preview. This is not connected to
            a doctor — it never leaves this device.
          </p>
          <button
            type="button"
            onClick={start}
            className="mt-3 min-h-[56px] rounded-xl border-2 border-[#7F1D1D] px-6 text-xl font-bold text-[#7F1D1D]"
          >
            Check my camera
          </button>
          {error && (
            <p className="mt-2 text-lg text-amber-900" role="alert">{error}</p>
          )}
        </>
      ) : (
        <>
          <p className="mt-1 text-base font-semibold text-amber-900" role="status">
            Local preview only — no doctor is connected.
          </p>
          <video
            ref={videoRef}
            muted
            playsInline
            aria-label="Local camera preview"
            className="mt-2 aspect-video w-full rounded-xl bg-zinc-900"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-pressed={muted}
              className="min-h-[48px] rounded-xl border border-zinc-300 bg-white px-4 text-lg font-semibold"
            >
              {muted ? "Unmute" : "Mute"}
            </button>
            <button
              type="button"
              onClick={() => setCameraOff((c) => !c)}
              aria-pressed={cameraOff}
              className="min-h-[48px] rounded-xl border border-zinc-300 bg-white px-4 text-lg font-semibold"
            >
              {cameraOff ? "Camera on" : "Camera off"}
            </button>
            <button
              type="button"
              onClick={close}
              className="min-h-[48px] rounded-xl bg-zinc-900 px-4 text-lg font-bold text-white"
            >
              Close preview
            </button>
          </div>
        </>
      )}
    </div>
  );
}
