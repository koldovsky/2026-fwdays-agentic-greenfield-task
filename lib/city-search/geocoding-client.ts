import {
  buildGeocodingUrl,
  normalizeGeocodingResponse,
  type CityLocation,
  type OpenMeteoGeocodingResponse,
} from "./geocoding";

const cache = new Map<string, CityLocation[]>();

export async function fetchCitySuggestions(query: string): Promise<CityLocation[]> {
  const url = buildGeocodingUrl(query);

  if (!url) {
    return [];
  }

  const cacheKey = url.toString();
  const cached = cache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await fetch(cacheKey);

  if (!response.ok) {
    throw new Error("Geocoding request failed");
  }

  const payload = (await response.json()) as OpenMeteoGeocodingResponse;
  const suggestions = normalizeGeocodingResponse(payload);
  cache.set(cacheKey, suggestions);

  return suggestions;
}
