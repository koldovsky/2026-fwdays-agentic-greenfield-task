import type { GeocodedPlace } from "./types";
import { mergeAndRankPlaces } from "./merge-places";
import { searchNominatim } from "./nominatim-client";
import { searchPhoton } from "./photon-client";

export async function searchPlaces(
  query: string,
  signal: AbortSignal,
): Promise<GeocodedPlace[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const [nominatimResults, photonResults] = await Promise.all([
    searchNominatim(trimmed, signal).catch(() => [] as GeocodedPlace[]),
    searchPhoton(trimmed, signal).catch(() => [] as GeocodedPlace[]),
  ]);

  if (signal.aborted) {
    return [];
  }

  const merged = mergeAndRankPlaces(nominatimResults, photonResults, trimmed);

  if (merged.length > 0) {
    return merged;
  }

  return photonResults.slice(0, 5);
}
