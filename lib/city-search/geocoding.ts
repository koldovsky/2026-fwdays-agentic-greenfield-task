const GEOCODING_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";
const MIN_QUERY_LENGTH = 2;
const DEFAULT_COUNT = 5;
const DEFAULT_LANGUAGE = "uk";

export type OpenMeteoGeocodingResult = {
  id?: number;
  name?: string;
  latitude?: number;
  longitude?: number;
  country_code?: string;
  country?: string;
  admin1?: string;
  timezone?: string;
  population?: number;
};

export type OpenMeteoGeocodingResponse = {
  results?: OpenMeteoGeocodingResult[];
};

export type CityLocation = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  countryCode: string | null;
  country: string | null;
  region: string | null;
  timezone: string | null;
  population: number | null;
  label: string;
  flag: string | null;
};

export function buildGeocodingUrl(
  query: string,
  options: { count?: number; language?: string } = {},
): URL | null {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < MIN_QUERY_LENGTH) {
    return null;
  }

  const url = new URL(GEOCODING_ENDPOINT);
  url.searchParams.set("name", normalizedQuery);
  url.searchParams.set("count", String(options.count ?? DEFAULT_COUNT));
  url.searchParams.set("language", options.language ?? DEFAULT_LANGUAGE);
  url.searchParams.set("format", "json");

  return url;
}

export function shouldRequestGeocoding(
  query: string,
  selectedLocation: Pick<CityLocation, "name"> | null = null,
): boolean {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < MIN_QUERY_LENGTH) {
    return false;
  }

  return selectedLocation?.name !== normalizedQuery;
}

export function normalizeGeocodingResponse(
  response: OpenMeteoGeocodingResponse,
): CityLocation[] {
  return (response.results ?? []).flatMap((item) => {
    if (
      typeof item.id !== "number" ||
      !item.name ||
      typeof item.latitude !== "number" ||
      typeof item.longitude !== "number"
    ) {
      return [];
    }

    const countryCode = normalizeCountryCode(item.country_code);
    const country = item.country?.trim() || null;
    const region = item.admin1?.trim() || null;
    const flag = countryCodeToFlag(countryCode);
    const label = [item.name, region, country].filter(Boolean).join(", ");

    return [
      {
        id: item.id,
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
        countryCode,
        country,
        region,
        timezone: item.timezone?.trim() || null,
        population: typeof item.population === "number" ? item.population : null,
        label,
        flag,
      },
    ];
  });
}

export function selectedLocationToSearchParams(location: CityLocation): URLSearchParams {
  const params = new URLSearchParams();
  params.set("lat", String(location.latitude));
  params.set("lon", String(location.longitude));
  params.set("name", location.name);
  return params;
}

export function getEnterAutoSelection(
  suggestions: readonly CityLocation[],
): CityLocation | null {
  return suggestions.length === 1 ? suggestions[0] : null;
}

export function countryCodeToFlag(countryCode: string | null | undefined): string | null {
  const normalized = normalizeCountryCode(countryCode);

  if (!normalized || normalized.length !== 2) {
    return null;
  }

  const [first, second] = normalized;
  return String.fromCodePoint(
    127397 + first.charCodeAt(0),
    127397 + second.charCodeAt(0),
  );
}

function normalizeCountryCode(countryCode: string | null | undefined): string | null {
  const normalized = countryCode?.trim().toUpperCase();
  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}
