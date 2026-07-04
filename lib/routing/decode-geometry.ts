import type { LatLon } from "@/lib/route-engine";

import type { OsrmGeoJsonGeometry } from "./types";

export function decodeOsrmGeometry(geometry: OsrmGeoJsonGeometry): LatLon[] | null {
  if (geometry.type !== "LineString" || !Array.isArray(geometry.coordinates)) {
    return null;
  }

  const polyline = geometry.coordinates
    .filter(
      (pair): pair is [number, number] =>
        Array.isArray(pair) &&
        pair.length >= 2 &&
        Number.isFinite(pair[0]) &&
        Number.isFinite(pair[1]),
    )
    .map(([lon, lat]) => ({ lat, lon }));

  return polyline.length >= 2 ? polyline : null;
}
