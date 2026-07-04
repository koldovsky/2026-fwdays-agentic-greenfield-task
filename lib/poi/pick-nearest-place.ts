import { haversineKm } from "@/lib/route-engine/geo";
import type { LatLon } from "@/lib/route-engine";

import type { PoiPlace } from "@/lib/poi/types";

export function pickNearestPlace(
  target: LatLon,
  places: PoiPlace[],
  maxRadiusKm: number,
): PoiPlace | null {
  let nearest: PoiPlace | null = null;
  let nearestDistanceKm = Infinity;

  for (const place of places) {
    const distanceKm = haversineKm(target, place);

    if (distanceKm > maxRadiusKm || distanceKm >= nearestDistanceKm) {
      continue;
    }

    nearest = place;
    nearestDistanceKm = distanceKm;
  }

  return nearest;
}

/** @deprecated Use pickNearestPlace */
export const pickNearestFuelStation = pickNearestPlace;
