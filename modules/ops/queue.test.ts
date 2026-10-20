import { describe, expect, it } from "vitest";
import { detectNewIds, markSeen, sectionFor } from "./queue";

describe("dispatcher queue (sections and one-shot alerts)", () => {
  it("sections keep availability distinct from dispatch", () => {
    expect(sectionFor("REQUEST_STARTED")).toBe("incoming");
    expect(sectionFor("REQUEST_SENT")).toBe("incoming");
    expect(sectionFor("UNABLE_TO_CONFIRM")).toBe("incoming");
    expect(sectionFor("ACKNOWLEDGED")).toBe("awaiting");
    expect(sectionFor("DISPATCHED_ACCEPTED")).toBe("dispatched");
    expect(sectionFor("EN_ROUTE")).toBe("dispatched");
    expect(sectionFor("CANCELLED")).toBe("closed");
    expect(sectionFor("COMPLETED_HANDED_OVER")).toBe("closed");
  });

  it("alerts each new incident exactly once across polls", () => {
    const first = detectNewIds([], [{ id: "a" }, { id: "b" }]);
    expect(first).toEqual(["a", "b"]);
    const known = ["a", "b"];
    expect(detectNewIds(known, [{ id: "a" }, { id: "b" }])).toEqual([]);
    expect(detectNewIds([...known, ...first], [{ id: "a" }, { id: "b" }, { id: "c" }])).toEqual([
      "c",
    ]);
  });

  it("clearing an alert keeps the incident", () => {
    expect(markSeen(["a", "b"], "a")).toEqual(["b"]);
    expect(markSeen(["b"], "missing")).toEqual(["b"]);
  });
});
