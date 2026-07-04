import { describe, expect, it } from "vitest";

import { pickNearestPlace } from "@/lib/poi/pick-nearest-place";
import type { FuelStation } from "@/lib/poi/types";

const stations: FuelStation[] = [
  { id: "node/1", lat: 50.01, lon: 30, name: "Far" },
  { id: "node/2", lat: 50.001, lon: 30, name: "Near before" },
  { id: "node/3", lat: 50.002, lon: 30.001, name: "Near after" },
];

describe("pickNearestPlace", () => {
  it("returns the closest station within the search radius", () => {
    const nearest = pickNearestPlace(
      { lat: 50, lon: 30 },
      stations,
      5,
    );

    expect(nearest?.name).toBe("Near before");
  });

  it("returns null when no station is within the radius", () => {
    const nearest = pickNearestPlace(
      { lat: 50, lon: 30 },
      stations,
      0.05,
    );

    expect(nearest).toBeNull();
  });
});
