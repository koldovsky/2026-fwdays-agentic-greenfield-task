import type { GeocodedPlace } from "./types";

const PLACE_KEY_PRECISION = 2;
const MAX_RESULTS = 5;

function placeKey(place: GeocodedPlace): string {
  return `${place.lat.toFixed(PLACE_KEY_PRECISION)},${place.lon.toFixed(PLACE_KEY_PRECISION)}`;
}

function normalizeForMatch(text: string): string {
  return text.trim().toLocaleLowerCase("uk");
}

function scorePlace(place: GeocodedPlace, query: string): number {
  const q = normalizeForMatch(query);
  const name = normalizeForMatch(place.name);
  let score = 0;

  if (name.startsWith(q)) {
    score += 1000;
  } else if (name.includes(q)) {
    score += 200;
  } else if (q.length >= 3 && name.includes(q.slice(0, 3))) {
    score += 50;
  }

  const region = normalizeForMatch(place.region);
  const country = normalizeForMatch(place.country);
  if (region.startsWith(q) || country.startsWith(q)) {
    score += 25;
  }

  return score;
}

export function mergeAndRankPlaces(
  nominatim: GeocodedPlace[],
  photon: GeocodedPlace[],
  query: string,
): GeocodedPlace[] {
  const merged = new Map<string, GeocodedPlace>();

  for (const place of photon) {
    merged.set(placeKey(place), place);
  }

  for (const place of nominatim) {
    merged.set(placeKey(place), place);
  }

  return [...merged.values()]
    .map((place) => ({ place, score: scorePlace(place, query) }))
    .filter(({ score }) => score > 0)
    .toSorted((a, b) => b.score - a.score)
    .map(({ place }) => place)
    .slice(0, MAX_RESULTS);
}
