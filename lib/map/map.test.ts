import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAP_ZOOM,
  getMapCenter,
  getMapSkeletonClassName,
  getMarkerPopupLabel,
  MAP_MIN_HEIGHT_PX,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
} from "./map-config";
import {
  buildReverseGeocodingUrl,
  locationFromCoordinates,
  normalizeReverseGeocodingResponse,
} from "./reverse-geocode";

describe("map helpers", () => {
  // @trace FR-MAP-01
  // @trace FR-MAP-04
  it("exposes OSM tile config and default zoom", () => {
    expect(OSM_TILE_URL).toContain("openstreetmap.org");
    expect(OSM_ATTRIBUTION).toBe("© OpenStreetMap contributors");
    expect(DEFAULT_MAP_ZOOM).toBeGreaterThan(0);
    expect(getMapCenter({ latitude: 50.45, longitude: 30.52 })).toEqual([50.45, 30.52]);
  });

  // @trace FR-MAP-02
  it("uses the city label for marker popup text", () => {
    expect(
      getMarkerPopupLabel({
        name: "Kyiv",
        label: "Kyiv, Kyiv, Україna",
      }),
    ).toBe("Kyiv, Kyiv, Україna");
  });

  // @trace FR-MAP-03
  it("builds Nominatim reverse URLs and normalizes click results", () => {
    const url = buildReverseGeocodingUrl(50.45, 30.52);

    expect(url.hostname).toBe("nominatim.openstreetmap.org");
    expect(url.pathname).toBe("/reverse");
    expect(url.searchParams.get("lat")).toBe("50.45");
    expect(url.searchParams.get("lon")).toBe("30.52");
    expect(url.searchParams.get("accept-language")).toBe("uk");

    const location = normalizeReverseGeocodingResponse(50.45466, 30.5238, {
      place_id: 421866,
      address: {
        city: "Kyiv",
        state: "Kyiv",
        country: "Україна",
        country_code: "ua",
      },
    });

    expect(location.name).toBe("Kyiv");
    expect(location.latitude).toBe(50.45466);
    expect(location.longitude).toBe(30.5238);
    expect(location.flag).toBe("🇺🇦");

    const fallback = locationFromCoordinates(48.1, 24.7);
    expect(fallback.label).toBe("48.10, 24.70");
  });

  // @trace FR-MAP-05
  it("keeps a stable skeleton footprint for SSR placeholder", () => {
    expect(MAP_MIN_HEIGHT_PX).toBe(320);
    expect(getMapSkeletonClassName()).toContain("min-h-[320px]");
  });
});
