import { afterEach, describe, expect, it, vi } from "vitest";

import { snapStopsToPoi } from "@/lib/poi/snap-stops-to-poi";
import { segmentRoute } from "@/lib/route-engine";
import { straightPolyline } from "@/lib/route-engine/__tests__/fixtures";

describe("snapStopsToPoi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("snaps rest stops to the nearest fuel station and updates labels", async () => {
    const polyline = straightPolyline(450, 1);
    const segmentResult = segmentRoute({
      polyline,
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
    const originalLat = restBefore!.lat;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          elements: [
            {
              type: "node",
              id: 1,
              lat: restBefore!.lat + 0.01,
              lon: restBefore!.lon,
              tags: { amenity: "fuel", name: "WOG" },
            },
          ],
        }),
      }),
    );

    await snapStopsToPoi(segmentResult.itinerary, polyline);

    const restAfter = segmentResult.itinerary.stops.find(
      (stop) => stop.kind === "rest",
    );

    expect(restAfter?.placeName).toBe("WOG");
    expect(restAfter?.lat).toBeCloseTo(originalLat + 0.01, 3);
  });

  it("keeps ideal rest stops when Overpass returns no stations", async () => {
    const polyline = straightPolyline(450, 1);
    const segmentResult = segmentRoute({
      polyline,
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
    const originalLat = restBefore!.lat;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ elements: [] }),
      }),
    );

    await snapStopsToPoi(segmentResult.itinerary, polyline);

    expect(
      segmentResult.itinerary.stops.find((stop) => stop.kind === "rest")?.lat,
    ).toBe(originalLat);
    expect(
      segmentResult.itinerary.stops.find((stop) => stop.kind === "rest")
        ?.placeName,
    ).toBeUndefined();
  });
});
