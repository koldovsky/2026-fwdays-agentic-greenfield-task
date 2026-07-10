import { countryCodeToFlag, type CityLocation } from "@/lib/city-search/geocoding";

const NOMINATIM_REVERSE_ENDPOINT = "https://nominatim.openstreetmap.org/reverse";
const DEFAULT_LANGUAGE = "uk";

export type NominatimReverseResponse = {
  place_id?: number;
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
};

export function buildReverseGeocodingUrl(
  latitude: number,
  longitude: number,
  options: { language?: string } = {},
): URL {
  const url = new URL(NOMINATIM_REVERSE_ENDPOINT);
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", options.language ?? DEFAULT_LANGUAGE);
  url.searchParams.set("zoom", "10");
  return url;
}

export function locationFromCoordinates(
  latitude: number,
  longitude: number,
): CityLocation {
  const label = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;

  return {
    id: syntheticLocationId(latitude, longitude),
    name: label,
    latitude,
    longitude,
    countryCode: null,
    country: null,
    region: null,
    timezone: null,
    population: null,
    label,
    flag: null,
  };
}

export function normalizeReverseGeocodingResponse(
  latitude: number,
  longitude: number,
  response: NominatimReverseResponse,
): CityLocation {
  const address = response.address;
  const name =
    address?.city?.trim() ||
    address?.town?.trim() ||
    address?.village?.trim() ||
    address?.municipality?.trim() ||
    response.display_name?.split(",")[0]?.trim() ||
    `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;

  const region = address?.state?.trim() || null;
  const country = address?.country?.trim() || null;
  const countryCode = normalizeCountryCode(address?.country_code);
  const label = [name, region, country].filter(Boolean).join(", ");

  return {
    id: response.place_id ?? syntheticLocationId(latitude, longitude),
    name,
    latitude,
    longitude,
    countryCode,
    country,
    region,
    timezone: null,
    population: null,
    label,
    flag: countryCodeToFlag(countryCode),
  };
}

function normalizeCountryCode(countryCode: string | null | undefined): string | null {
  const normalized = countryCode?.trim().toUpperCase();
  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

function syntheticLocationId(latitude: number, longitude: number): number {
  const latPart = Math.round(latitude * 10_000);
  const lonPart = Math.round(longitude * 10_000);
  return Math.abs(latPart * 1_000_003 + lonPart);
}
