import { describe, expect, it } from "vitest";
import {
  MAX_VOICE_MESSAGE_SEC,
  formatDuration,
  micErrorMessage,
  supportsRecording,
} from "./recording";

describe("voice-message recording helpers (no hardware)", () => {
  it("caps recordings at 120 seconds", () => {
    expect(MAX_VOICE_MESSAGE_SEC).toBe(120);
  });

  it("formats the timer as m:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(9)).toBe("0:09");
    expect(formatDuration(75)).toBe("1:15");
    expect(formatDuration(120)).toBe("2:00");
    expect(formatDuration(-5)).toBe("0:00");
  });

  it("detects recording support from explicit capability flags", () => {
    expect(supportsRecording(true, true)).toBe(true);
    expect(supportsRecording(false, true)).toBe(false);
    expect(supportsRecording(true, false)).toBe(false);
    expect(supportsRecording(false, false)).toBe(false);
  });

  it("explains blocked microphone permission with a written alternative", () => {
    const message = micErrorMessage({ name: "NotAllowedError" } as DOMException);
    expect(message).toMatch(/blocked/i);
    expect(message).toMatch(/writing/i);
  });

  it("explains a missing microphone without blaming the user", () => {
    expect(micErrorMessage({ name: "NotFoundError" } as DOMException)).toMatch(
      /no microphone/i,
    );
  });

  it("falls back to a retryable message for unknown failures", () => {
    expect(micErrorMessage(new Error("boom"))).toMatch(/try again/i);
    expect(micErrorMessage("weird")).toMatch(/try again/i);
    expect(micErrorMessage(null)).toMatch(/try again/i);
  });
});
