"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_VOICE_MESSAGE_SEC,
  formatDuration,
  micErrorMessage,
  supportsRecording,
} from "@/modules/triage/recording";

type Phase = "idle" | "requesting" | "recording" | "recorded";

/**
 * Local-only voice message recorder. Audio stays in browser memory: it is
 * never uploaded, persisted, transcribed, or sent anywhere. Discarding (or
 * leaving the page) destroys it. Speech recognition and tap answers in
 * VoiceTriage are untouched by this component.
 */
export function VoiceMessage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [supported] = useState(
    () =>
      typeof window !== "undefined" &&
      supportsRecording(
        typeof MediaRecorder !== "undefined",
        typeof navigator?.mediaDevices?.getUserMedia === "function",
      ),
  );

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const capRef = useRef<number | null>(null);
  const urlRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);
  // Set when discarding because recording failed: keeps onstop from
  // overwriting the specific error with the generic empty-audio message.
  const failedRef = useRef(false);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        // Track already stopped.
      }
    });
    streamRef.current = null;
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (capRef.current !== null) {
      window.clearTimeout(capRef.current);
      capRef.current = null;
    }
  }, []);

  const revokeUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  // Unmount-only cleanup: no state updates here. If permission resolves
  // after unmount, the tracks are stopped immediately (see start()).
  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      if (capRef.current !== null) window.clearTimeout(capRef.current);
      try {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      } catch {
        // Already stopped.
      }
      streamRef.current?.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Already stopped.
        }
      });
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const finishRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    try {
      recorder.stop();
    } catch {
      setError("Recording could not be stopped cleanly. The partial audio was discarded.");
      chunksRef.current = [];
    }
  }, []);

  const discard = useCallback(() => {
    clearTimers();
    try {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    } catch {
      // Already stopped.
    }
    recorderRef.current = null;
    chunksRef.current = [];
    stopTracks();
    revokeUrl();
    setAudioUrl(null);
    setElapsed(0);
    setError(null);
    setPhase("idle");
  }, [clearTimers, revokeUrl, stopTracks]);

  async function start() {
    if (!supported) return;
    setError(null);
    setPhase("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (cancelledRef.current) {
        // Unmounted (or superseded) while permission was pending: release now.
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        clearTimers();
        const chunks = chunksRef.current;
        chunksRef.current = [];
        stopTracks();
        recorderRef.current = null;
        if (cancelledRef.current) return;
        if (chunks.length === 0) {
          // After a recording failure the specific message is already set;
          // only ordinary empty captures get the generic guidance.
          if (!failedRef.current) {
            setError("No audio was captured. Try again, or continue without a recording.");
          }
          failedRef.current = false;
          setPhase("idle");
          return;
        }
        failedRef.current = false;
        revokeUrl();
        const url = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
        urlRef.current = url;
        setAudioUrl(url);
        setPhase("recorded");
      };
      recorder.onerror = () => {
        failedRef.current = true;
        setError("Recording failed partway. The partial audio was discarded.");
        discard();
      };
      recorder.start();
      setElapsed(0);
      setPhase("recording");
      timerRef.current = window.setInterval(() => {
        setElapsed((prev) => Math.min(prev + 1, MAX_VOICE_MESSAGE_SEC));
      }, 1000);
      capRef.current = window.setTimeout(() => {
        finishRecording();
      }, MAX_VOICE_MESSAGE_SEC * 1000);
    } catch (err) {
      if (cancelledRef.current) return;
      stopTracks();
      setError(micErrorMessage(err));
      setPhase("idle");
    }
  }

  if (!supported) {
    return (
      <div className="rounded-xl bg-white p-4">
        <p className="text-lg text-zinc-700" role="note">
          Voice recording is not supported in this browser. You can continue without it —
          describe what happened in writing on the report page, or answer the quick questions
          above by tapping.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="rounded-xl border-2 border-[#7F1D1D] bg-[#FBEAEA] p-4"
        role="note"
        aria-label="Recording privacy notice"
      >
        <p className="text-lg font-semibold text-[#5B1414]">
          This recording stays on this device temporarily. It is not sent or saved, and
          responders cannot hear it.
        </p>
        <p className="mt-1 text-base text-[#5B1414]">
          Leaving or refreshing this page can lose the recording.
        </p>
      </div>

      <p className="text-xl font-bold text-zinc-900" role="status" aria-live="polite">
        {phase === "idle" && "No recording yet."}
        {phase === "requesting" && "Waiting for microphone permission…"}
        {phase === "recording" && "Recording… tap stop when you finish."}
        {phase === "recorded" && "Recording ready — listen, re-record, or discard it."}
      </p>

      {phase !== "recorded" && (
        <p className="text-3xl font-bold text-zinc-900" aria-hidden="true">
          {formatDuration(elapsed)}
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-lg text-amber-900" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {(phase === "idle" || phase === "requesting") && (
          <button
            type="button"
            disabled={phase === "requesting"}
            onClick={start}
            aria-label="Record a voice message"
            className="min-h-[56px] flex-1 rounded-xl bg-[#7F1D1D] px-5 text-xl font-bold text-white hover:bg-[#651414] disabled:opacity-50"
          >
            {phase === "requesting" ? "Waiting for microphone…" : "● Record voice message"}
          </button>
        )}
        {phase === "recording" && (
          <button
            type="button"
            onClick={finishRecording}
            aria-label="Stop recording"
            className="min-h-[56px] flex-1 rounded-xl bg-zinc-900 px-5 text-xl font-bold text-white"
          >
            ■ Stop recording
          </button>
        )}
        {phase === "recorded" && audioUrl && (
          <>
            <button
              type="button"
              onClick={discard}
              aria-label="Record again"
              className="min-h-[56px] flex-1 rounded-xl bg-[#7F1D1D] px-5 text-xl font-bold text-white hover:bg-[#651414]"
            >
              ↺ Record again
            </button>
            <button
              type="button"
              onClick={discard}
              aria-label="Discard voice message"
              className="min-h-[56px] rounded-xl border-2 border-zinc-300 px-5 text-xl font-semibold text-zinc-700"
            >
              ✕ Discard
            </button>
          </>
        )}
      </div>

      {phase === "recorded" && audioUrl && (
        <audio controls src={audioUrl} aria-label="Voice message playback" className="w-full" />
      )}
    </div>
  );
}
