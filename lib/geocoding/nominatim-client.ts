import type { GeocodedPlace } from "./types";

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  suburb?: string;
  county?: string;
  state?: string;
  region?: string;
  country?: string;
};

type NominatimResult = {
  place_id?: number;
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  address?: NominatimAddress;
};

const NOMINATIM_API = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "MotoRouteAgent/0.1 (motorcycle trip planner; lab MVP)";

function pickName(result: NominatimResult): string {
  const address = result.address ?? {};
  return (
    result.name ??
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.suburb ??
    address.county ??
    address.state ??
    result.display_name?.split(",")[0]?.trim() ??
    ""
  );
}

function pickRegion(address: NominatimAddress, name: string): string {
  const region = address.state ?? address.county ?? address.region ?? "";
  return region === name ? "" : region;
}

export function normalizeNominatimResult(
  result: NominatimResult,
  index: number,
): GeocodedPlace | null {
  const lat = Number.parseFloat(result.lat ?? "");
  const lon = Number.parseFloat(result.lon ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  const address = result.address ?? {};
  const name = pickName(result);
  if (!name) {
    return null;
  }

  return {
    id: result.place_id != null ? String(result.place_id) : `${lat},${lon},${index}`,
    name,
    region: pickRegion(address, name),
    country: address.country ?? "",
    lat,
    lon,
  };
}

function dedupePlaces(places: GeocodedPlace[]): GeocodedPlace[] {
  const seen = new Set<string>();
  const unique: GeocodedPlace[] = [];

  for (const place of places) {
    const key = `${place.lat.toFixed(4)},${place.lon.toFixed(4)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(place);
  }

  return unique;
}

export async function searchPlaces(
  query: string,
  signal: AbortSignal,
): Promise<GeocodedPlace[]> {
  const url = new URL(NOMINATIM_API);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "8");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "uk");

  const response = await fetch(url.toString(), {
    signal,
    headers: {
      Accept: "application/json",
      "Accept-Language": "uk",
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as NominatimResult[];

  const places = data.flatMap((result, index) => {
    const place = normalizeNominatimResult(result, index);
    return place ? [place] : [];
  });

  return dedupePlaces(places).slice(0, 5);
}
