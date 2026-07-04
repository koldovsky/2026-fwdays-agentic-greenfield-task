import { describe, expect, it } from "vitest";

import { segmentRoute } from "@/lib/route-engine/segment-route";
import { straightPolyline } from "@/lib/route-engine/__tests__/fixtures";

describe("segmentRoute", () => {
  it("returns an error for invalid polylines without throwing", () => {
    const result = segmentRoute({
      polyline: [{ lat: 50, lon: 30 }],
      restKm: 150,
      dayKm: 400,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_POLYLINE");
    }
  });

  it("returns an error for invalid constraints without throwing", () => {
    const polyline = straightPolyline(100, 1);
    const result = segmentRoute({
      polyline,
      restKm: 0,
      dayKm: 400,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_CONSTRAINTS");
    }
  });

  it("returns a complete itinerary contract for a long route", () => {
    const polyline = straightPolyline(450, 1);
    const result = segmentRoute({
      polyline,
      restKm: 150,
      dayKm: 400,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const { itinerary } = result;

    expect(itinerary.stops[0].kind).toBe("start");
    expect(itinerary.stops[itinerary.stops.length - 1].kind).toBe("end");
    expect(itinerary.restStopCount).toBe(2);
    expect(itinerary.totalDistanceKm).toBeCloseTo(450, 0);
    expect(itinerary.totalDays).toBe(2);

    for (const stop of itinerary.stops) {
      expect(stop.dayIndex).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(stop.lat)).toBe(true);
      expect(Number.isFinite(stop.lon)).toBe(true);
    }

    expect(itinerary.days).toHaveLength(itinerary.totalDays);
    for (const day of itinerary.days) {
      expect(day.polyline.length).toBeGreaterThan(1);
    }
  });
});
