import { describe, expect, it } from "vitest";

import { cumulativeDistances } from "@/lib/route-engine/geo";
import {
  computeOvernightAnchors,
  placeRestStops,
} from "@/lib/route-engine/place-rest-stops";
import { straightPolyline } from "@/lib/route-engine/__tests__/fixtures";

describe("placeRestStops (FR-VIEW-02)", () => {
  it("places rest stops every restKm within a single travel day", () => {
    const polyline = straightPolyline(450, 1);
    const cumulative = cumulativeDistances(polyline);
    const stops = placeRestStops(polyline, cumulative, 150, 500);

    const restStops = stops.filter((stop) => stop.kind === "rest");

    expect(restStops).toHaveLength(2);
    expect(restStops[0].distanceFromStartKm).toBeCloseTo(150, 0);
    expect(restStops[1].distanceFromStartKm).toBeCloseTo(300, 0);
  });

  it("resets rest intervals after each overnight anchor", () => {
    const polyline = straightPolyline(900, 1);
    const cumulative = cumulativeDistances(polyline);
    const stops = placeRestStops(polyline, cumulative, 150, 400);

    const restDistances = stops
      .filter((stop) => stop.kind === "rest")
      .map((stop) => stop.distanceFromStartKm);

    expect(restDistances).toEqual(
      expect.arrayContaining([150, 300, 550, 700]),
    );
    expect(restDistances).not.toContain(450);
    expect(restDistances).not.toContain(600);
  });

  it("skips intermediate rests when the route is shorter than restKm", () => {
    const polyline = straightPolyline(100, 1);
    const cumulative = cumulativeDistances(polyline);
    const stops = placeRestStops(polyline, cumulative, 150, 400);

    expect(stops.filter((stop) => stop.kind === "rest")).toHaveLength(0);
    expect(stops[0].kind).toBe("start");
    expect(stops[stops.length - 1].kind).toBe("end");
  });
});

describe("computeOvernightAnchors", () => {
  it("matches day-boundary distances used by splitDays", () => {
    expect(computeOvernightAnchors(900, 400)).toEqual([400, 800]);
    expect(computeOvernightAnchors(450, 400)).toEqual([400]);
    expect(computeOvernightAnchors(250, 400)).toEqual([]);
  });
});
