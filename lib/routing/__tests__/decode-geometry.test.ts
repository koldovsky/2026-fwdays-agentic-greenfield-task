import { describe, expect, it } from "vitest";

import { decodeOsrmGeometry } from "@/lib/routing/decode-geometry";
import osrmFixture from "@/lib/routing/__tests__/fixtures/osrm-route.json";
import type { OsrmGeoJsonGeometry } from "@/lib/routing/types";

describe("decodeOsrmGeometry", () => {
  it("normalizes OSRM [lon, lat] pairs to LatLon objects", () => {
    const polyline = decodeOsrmGeometry(
      osrmFixture.routes[0].geometry as OsrmGeoJsonGeometry,
    );

    expect(polyline).not.toBeNull();
    expect(polyline!.length).toBeGreaterThanOrEqual(2);
    expect(polyline![0]).toEqual({ lat: 50, lon: 30 });
    expect(polyline![1].lat).toBeCloseTo(50.009, 3);
    expect(polyline![1].lon).toBeCloseTo(30, 3);
  });

  it("returns null for invalid geometry", () => {
    expect(
      decodeOsrmGeometry({
        type: "LineString",
        coordinates: [[30, 50]],
      }),
    ).toBeNull();
  });
});
