import { describe, expect, it } from "vitest";
import { incidentMapEmbedUrl } from "./map";

describe("incident location map URL", () => {
  it("centers the opt-in map around the incident pin", () => {
    const url = new URL(incidentMapEmbedUrl(6.5244, 3.3792));

    expect(url.origin).toBe("https://www.openstreetmap.org");
    expect(url.pathname).toBe("/export/embed.html");
    expect(url.searchParams.get("layer")).toBe("mapnik");
    expect(url.searchParams.get("marker")).toBe("6.5244,3.3792");
    expect(url.searchParams.get("bbox")).toBe("3.3702,6.5184,3.3882,6.5304");
  });

  it("keeps polar and date-line bounds inside map coordinates", () => {
    const polar = new URL(incidentMapEmbedUrl(89, 179.999));
    const [west, south, east, north] = polar.searchParams
      .get("bbox")!
      .split(",")
      .map(Number);

    expect(west).toBeGreaterThanOrEqual(-180);
    expect(east).toBeLessThanOrEqual(180);
    expect(south).toBeGreaterThanOrEqual(-85);
    expect(north).toBeLessThanOrEqual(85);
    expect(north).toBeGreaterThan(south);
  });
});
