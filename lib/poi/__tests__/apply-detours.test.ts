import { afterEach, describe, expect, it, vi } from "vitest";

import { applyDetoursToItinerary } from "@/lib/poi/apply-detours";
import { snapStopsToPoi } from "@/lib/poi/snap-stops-to-poi";
import { segmentRoute } from "@/lib/route-engine";
import { cumulativeDistances } from "@/lib/route-engine/geo";
import { straightPolyline } from "@/lib/route-engine/__tests__/fixtures";
import osrmFixture from "@/lib/routing/__tests__/fixtures/osrm-route.json";

describe("applyDetoursToItinerary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("inserts an out-and-back detour when a snapped stop is off the main route", async () => {
    const mainPolyline = straightPolyline(450, 1);
    const segmentResult = segmentRoute({
      polyline: mainPolyline,
      restKm: 150,
      dayKm: 400,
    });

    expect(segmentResult.ok).toBe(true);
    if (!segmentResult.ok) {
      return;
    }

    const restBefore = segmentResult.itinerary.stops.find(
      (stop) => stop.kind === "rest",
    );
    expect(restBefore).toBeDefined();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("overpass-api.de")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              elements: [
                {
                  type: "node",
                  id: 1,
                  lat: restBefore!.lat + 0.02,
                  lon: restBefore!.lon + 0.01,
                  tags: { amenity: "fuel", name: "WOG" },
                },
              ],
            }),
          });
        }

        return Promise.resolve({
          ok: true,
          json: async () => osrmFixture,
        });
      }),
    );

    await snapStopsToPoi(segmentResult.itinerary, mainPolyline);
    const mainLength =
      cumulativeDistances(mainPolyline).at(-1) ?? mainPolyline.length;

    await applyDetoursToItinerary(segmentResult.itinerary, mainPolyline);

    const displayLength = cumulativeDistances(segmentResult.itinerary.polyline).at(
      -1,
    );

    expect(restBefore?.placeName).toBe("WOG");
    expect(displayLength).toBeGreaterThan(mainLength);
  });
});
