// Pure helpers for the local-only voice-message recorder.
// No DOM, no microphone, no network: fully unit-testable. The component in
// `components/triage/VoiceMessage.tsx` owns all browser interaction.

/** Maximum recording length. The recorder stops itself here. */
export const MAX_VOICE_MESSAGE_SEC = 120;

/** Seconds -> "m:ss" for the on-screen timer. */
export function formatDuration(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Feature-detect recording without touching hardware. */
export function supportsRecording(
  hasMediaRecorder: boolean,
  hasGetUserMedia: boolean,
): boolean {
  return hasMediaRecorder && hasGetUserMedia;
}

/** Map a getUserMedia/MediaRecorder failure to plain-language guidance. */
export function micErrorMessage(error: unknown): string {
  // Duck-typed on purpose: cross-realm DOMExceptions can fail instanceof.
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String((error as { name: unknown }).name)
      : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Microphone access was blocked. Allow it in the browser address bar, or keep going without a recording — you can still describe what happened in writing.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No microphone was found on this device. You can continue without a recording.";
    case "NotSupportedError":
      return "Recording is not supported in this browser. You can continue without it.";
    case "AbortError":
      return "Recording was stopped before it started. Tap record to try again.";
    default:
      return "Recording could not start. Check the microphone and try again, or continue without a recording.";
  }
}
