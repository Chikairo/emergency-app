import { describe, expect, it } from "vitest";
import { resolveEmergencyNumber } from "./emergency-number";

describe("emergency-number resolution (never dial a placeholder)", () => {
  it("accepts configured short codes and international numbers", () => {
    expect(resolveEmergencyNumber("112")).toEqual({
      configured: true,
      display: "112",
      telHref: "tel:112",
    });
    expect(resolveEmergencyNumber("+234 801 234 5678")).toEqual({
      configured: true,
      display: "+2348012345678",
      telHref: "tel:+2348012345678",
    });
  });

  it("rejects mock, unspecified, empty, and malformed values", () => {
    for (const raw of [undefined, "", "   ", "000-MOCK", "UNSPECIFIED-USE-MOCK", "1", "1234567890123456", "call-me"]) {
      const resolved = resolveEmergencyNumber(raw);
      expect(resolved.configured).toBe(false);
      expect(resolved.display).toBeNull();
      expect(resolved.telHref).toBeNull();
    }
  });
});
