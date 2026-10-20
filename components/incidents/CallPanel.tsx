"use client";

import { useEffect, useRef, useState } from "react";

// Voice/video consultation panel. Voice-first: calls start with the camera
// off unless the user opts into video, and the camera/mic can be toggled
// in-call. Honest states only: the call is "connected" exclusively after
// the video SDK fires its joined event. Without provider credentials the
// panel reports unconfigured and never pretends otherwise.
type CallPhase =
  | "idle"
  | "requesting"
  | "ready"
  | "connecting"
  | "connected"
  | "failed"
  | "ended";

interface DailyCall {
  join: (options: { url: string; token: string }) => Promise<unknown>;
  leave: () => Promise<void>;
  destroy: () => Promise<void>;
  on: (event: string, handler: () => void) => void;
  setLocalVideo: (on: boolean) => Promise<void>;
  setLocalAudio: (on: boolean) => Promise<void>;
}

export function CallPanel({
  incidentId,
  isStaff,
  autoRequest = false,
  startCameraOff = true,
}: {
  incidentId: string;
  isStaff: boolean;
  // Consultation screen: request the room immediately on mount and
  // preset the camera from the explicit voice/video choice.
  autoRequest?: boolean;
  startCameraOff?: boolean;
}) {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [detail, setDetail] = useState<string | null>(null);
  // Voice-first defaults: camera off, microphone on. Applied at join and
  // adjustable in-call; never overrides the connected-only-on-event rule.
  const [cameraOff, setCameraOff] = useState(startCameraOff);
  const [micMuted, setMicMuted] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const callRef = useRef<DailyCall | null>(null);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    return () => {
      const call = callRef.current;
      callRef.current = null;
      call?.leave().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (autoRequest && !autoStartedRef.current) {
      autoStartedRef.current = true;
      void request();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRequest]);

  async function request() {
    setPhase("requesting");
    setDetail(null);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: `web-${Date.now()}` }),
      });
      const data = (await res.json()) as {
        configured?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Call setup failed.");
      if (!data.configured) {
        setPhase("failed");
        setDetail(data.message ?? "Video consultation is not configured.");
        return;
      }
      setPhase("ready");
    } catch (e) {
      setPhase("failed");
      setDetail(e instanceof Error ? e.message : "Call setup failed.");
    }
  }

  async function join(as: "patient" | "doctor") {
    setPhase("connecting");
    setDetail(null);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/call/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ as }),
      });
      const data = (await res.json()) as {
        configured?: boolean;
        url?: string;
        token?: string;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.url || !data.token) {
        throw new Error(data.error ?? data.message ?? "Meeting access could not be issued.");
      }
      const { default: DailyIframe } = (await import("@daily-co/daily-js")) as unknown as {
        default: {
          createFrame: (
            parent: HTMLElement,
            options: { showLeaveButton: boolean },
          ) => DailyCall;
        };
      };
      if (!frameRef.current) throw new Error("Video area unavailable.");
      frameRef.current.innerHTML = "";
      const call = DailyIframe.createFrame(frameRef.current, { showLeaveButton: true });
      callRef.current = call;
      call.on("joined-meeting", () => setPhase("connected"));
      call.on("left-meeting", () => setPhase("ended"));
      call.on("error", () => {
        setPhase("failed");
        setDetail("The video connection failed. Try joining again.");
      });
      // Voice-first: start with the camera off unless opted into video.
      // A camera failure here must not block the voice call.
      try {
        await call.setLocalVideo(!cameraOff);
      } catch {
        setCameraOff(true);
      }
      await call.join({ url: data.url, token: data.token });
      // Still "connecting" until the joined-meeting event confirms it.
    } catch (e) {
      setPhase("failed");
      setDetail(e instanceof Error ? e.message : "Could not join the call.");
    }
  }

  async function leave() {
    const call = callRef.current;
    callRef.current = null;
    try {
      await call?.leave();
    } finally {
      setPhase("ended");
    }
  }

  async function toggleCamera() {
    const call = callRef.current;
    if (!call) return;
    const next = cameraOff;
    try {
      await call.setLocalVideo(next);
      setCameraOff(!next);
    } catch {
      setDetail("The camera could not be switched. The voice call continues.");
    }
  }

  async function toggleMic() {
    const call = callRef.current;
    if (!call) return;
    const next = !micMuted;
    try {
      await call.setLocalAudio(!next);
      setMicMuted(next);
    } catch {
      setDetail("The microphone could not be switched.");
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xl font-bold text-zinc-900">
        Voice / video consultation <span className="font-normal text-zinc-500">(optional)</span>
      </p>

      {phase === "idle" && (
        <>
          <p className="mt-1 text-base text-zinc-600">
            A private voice-first consultation for this incident, joined by patient and
            doctor. The camera stays off unless you turn it on.
          </p>
          <button
            type="button"
            onClick={request}
            className="mt-3 min-h-[56px] rounded-xl bg-[#7F1D1D] px-6 text-xl font-bold text-white hover:bg-[#651414]"
          >
            Start video consultation
          </button>
        </>
      )}

      {phase === "requesting" && (
        <p className="mt-2 text-lg text-zinc-700" role="status">Setting up the video room…</p>
      )}

      {phase === "ready" && (
        <>
          <p className="mt-2 text-lg text-zinc-700" role="status">
            Room ready. Join as patient, or as doctor if you are signed in as one.
          </p>
          <button
            type="button"
            aria-pressed={cameraOff}
            onClick={() => setCameraOff((v) => !v)}
            className="mt-2 min-h-[48px] rounded-xl border-2 border-zinc-300 px-4 text-lg font-semibold text-zinc-800"
          >
            {cameraOff ? "Camera off — join with voice first ✓" : "Camera on — join with video"}
          </button>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => join("patient")}
              className="min-h-[56px] rounded-xl bg-[#7F1D1D] px-5 text-xl font-bold text-white"
            >
              Join as patient
            </button>
            {isStaff && (
              <button
                type="button"
                onClick={() => join("doctor")}
                className="min-h-[56px] rounded-xl border-2 border-[#7F1D1D] px-5 text-xl font-bold text-[#7F1D1D]"
              >
                Join as doctor
              </button>
            )}
          </div>
        </>
      )}

      {phase === "connecting" && (
        <p className="mt-2 text-lg text-zinc-700" role="status">
          Connecting… not connected yet.
        </p>
      )}

      <div
        ref={frameRef}
        aria-label="Video call area"
        className={phase === "connected" || phase === "connecting" ? "mt-3 aspect-video w-full overflow-hidden rounded-xl bg-zinc-900" : undefined}
      />

      {phase === "connected" && (
        <>
          <p className="mt-2 text-lg font-bold text-green-900" role="status">
            Connected — you are in the consultation{cameraOff ? " (voice only)" : ""}.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleCamera}
              className="min-h-[56px] rounded-xl border-2 border-zinc-300 px-5 text-xl font-bold text-zinc-900"
            >
              {cameraOff ? "Turn camera on" : "Turn camera off"}
            </button>
            <button
              type="button"
              onClick={toggleMic}
              className="min-h-[56px] rounded-xl border-2 border-zinc-300 px-5 text-xl font-bold text-zinc-900"
            >
              {micMuted ? "Unmute" : "Mute"}
            </button>
            <button
              type="button"
              onClick={leave}
              className="min-h-[56px] rounded-xl bg-zinc-900 px-6 text-xl font-bold text-white"
            >
              Leave call
            </button>
          </div>
        </>
      )}

      {phase === "failed" && (
        <div className="mt-2">
          <p className="text-lg text-amber-900" role="alert">
            {detail ?? "The video call is unavailable."}
          </p>
          <button
            type="button"
            onClick={request}
            className="mt-2 min-h-[48px] rounded-xl border border-zinc-300 px-4 text-lg font-semibold"
          >
            Try again
          </button>
        </div>
      )}

      {phase === "ended" && (
        <div className="mt-2">
          <p className="text-lg text-zinc-700" role="status">Call ended.</p>
          <button
            type="button"
            onClick={request}
            className="mt-2 min-h-[48px] rounded-xl border border-zinc-300 px-4 text-lg font-semibold"
          >
            Start a new call
          </button>
        </div>
      )}
    </div>
  );
}
