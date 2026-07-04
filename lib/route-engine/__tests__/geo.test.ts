import { describe, expect, it } from "vitest";

import {
  cumulativeDistances,
  haversineKm,
  interpolateAtDistance,
  projectOntoPolyline,
  slicePolylineByDistance,
} from "@/lib/route-engine/geo";
import { straightPolyline } from "@/lib/route-engine/__tests__/fixtures";

describe("geo helpers", () => {
  it("computes haversine distance along a meridian", () => {
    const from = { lat: 50, lon: 30 };
    const to = { lat: 51, lon: 30 };

    expect(haversineKm(from, to)).toBeCloseTo(111.2, 0);
  });

  it("builds cumulative distances for a straight polyline", () => {
    const polyline = straightPolyline(10, 1);
    const cumulative = cumulativeDistances(polyline);

    expect(cumulative[0]).toBe(0);
    expect(cumulative[cumulative.length - 1]).toBeCloseTo(10, 0);
  });

  it("interpolates a point at a target distance", () => {
    const polyline = straightPolyline(100, 1);
    const cumulative = cumulativeDistances(polyline);
    const point = interpolateAtDistance(polyline, cumulative, 50);

    expect(point.lat).toBeGreaterThan(polyline[0].lat);
    expect(point.lon).toBeCloseTo(polyline[0].lon, 5);
  });

  it("slices a polyline between two distances", () => {
    const polyline = straightPolyline(100, 1);
    const cumulative = cumulativeDistances(polyline);
    const slice = slicePolylineByDistance(polyline, cumulative, 25, 75);

    expect(slice.length).toBeGreaterThan(2);
    expect(slice[0].lat).toBeLessThan(slice[slice.length - 1].lat);
  });

  it("projects a nearby point onto the polyline distance axis", () => {
    const polyline = straightPolyline(100, 1);
    const cumulative = cumulativeDistances(polyline);
    const projection = projectOntoPolyline(polyline, cumulative, {
      lat: polyline[50].lat + 0.01,
      lon: polyline[50].lon,
    });

    expect(projection.distanceKm).toBeGreaterThan(45);
    expect(projection.distanceKm).toBeLessThan(55);
  });
});
