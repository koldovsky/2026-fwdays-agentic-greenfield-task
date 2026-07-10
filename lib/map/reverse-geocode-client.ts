import type { CityLocation } from "@/lib/city-search/geocoding";
import {
  buildReverseGeocodingUrl,
  locationFromCoordinates,
  normalizeReverseGeocodingResponse,
} from "./reverse-geocode";

const NOMINATIM_USER_AGENT = "WeatherExplorer/1.0 (education; contact: local-dev)";

export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number,
): Promise<CityLocation> {
  try {
    const response = await fetch(buildReverseGeocodingUrl(latitude, longitude).toString(), {
      headers: {
        "Accept-Language": "uk",
        "User-Agent": NOMINATIM_USER_AGENT,
      },
    });

    if (!response.ok) {
      return locationFromCoordinates(latitude, longitude);
    }

    const payload = await response.json();
    return normalizeReverseGeocodingResponse(latitude, longitude, payload);
  } catch {
    return locationFromCoordinates(latitude, longitude);
  }
}
