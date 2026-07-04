import { describe, expect, it } from "vitest";

import { cumulativeDistances } from "@/lib/route-engine/geo";
import { placeRestStops } from "@/lib/route-engine/place-rest-stops";
import { splitDays } from "@/lib/route-engine/split-days";
import { straightPolyline } from "@/lib/route-engine/__tests__/fixtures";

describe("splitDays", () => {
  it("splits a 900 km route into three travel days with overnight markers", () => {
    const polyline = straightPolyline(900, 1);
    const cumulative = cumulativeDistances(polyline);
    const baseStops = placeRestStops(polyline, cumulative, 150, 400);
    const { stops, days } = splitDays(baseStops, polyline, cumulative, 400);

    expect(days).toHaveLength(3);
    expect(stops.filter((stop) => stop.kind === "overnight")).toHaveLength(2);

    for (const day of days) {
      expect(day.distanceKm).toBeLessThanOrEqual(400.1);
      expect(day.polyline.length).toBeGreaterThan(1);
    }
  });

  it("keeps short routes on a single day without overnight stops", () => {
    const polyline = straightPolyline(250, 1);
    const cumulative = cumulativeDistances(polyline);
    const baseStops = placeRestStops(polyline, cumulative, 150, 400);
    const { stops, days } = splitDays(baseStops, polyline, cumulative, 400);

    expect(days).toHaveLength(1);
    expect(stops.filter((stop) => stop.kind === "overnight")).toHaveLength(0);
  });
});
