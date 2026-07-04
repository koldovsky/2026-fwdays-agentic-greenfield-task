import { POI_SEARCH_RADIUS_M, OVERPASS_API_URL } from "@/lib/poi/constants";
import { parseFuelStation } from "@/lib/poi/format-fuel-station-name";
import { parseHotel } from "@/lib/poi/format-hotel-name";
import type { OverpassElement, PoiPlace } from "@/lib/poi/types";
import type { LatLon } from "@/lib/route-engine";

const HOTEL_TAG_FILTERS = [
  { key: "tourism", value: "hotel" },
  { key: "tourism", value: "guest_house" },
  { key: "tourism", value: "motel" },
  { key: "amenity", value: "hotel" },
] as const;

function buildOverpassQuery(
  points: LatLon[],
  radiusM: number,
  tagFilters: ReadonlyArray<{ key: string; value: string }>,
): string {
  const clauses = points
    .flatMap((point) =>
      tagFilters.flatMap(({ key, value }) => [
        `  node["${key}"="${value}"](around:${radiusM},${point.lat},${point.lon});`,
        `  way["${key}"="${value}"](around:${radiusM},${point.lat},${point.lon});`,
      ]),
    )
    .join("\n");

  return `[out:json][timeout:25];\n(\n${clauses}\n);\nout center tags;`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function queryOverpass(
  query: string,
  signal?: AbortSignal,
): Promise<OverpassElement[]> {
  const response = await fetch(OVERPASS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: `data=${encodeURIComponent(query)}`,
    signal,
  });

  if (!response.ok) {
    throw new Error("Overpass request failed.");
  }

  const data = (await response.json()) as { elements?: OverpassElement[] };
  return data.elements ?? [];
}

function dedupePlaces(
  elements: OverpassElement[],
  parser: (element: OverpassElement) => PoiPlace | null,
): PoiPlace[] {
  const places = new Map<string, PoiPlace>();

  for (const element of elements) {
    const place = parser(element);
    if (place) {
      places.set(place.id, place);
    }
  }

  return [...places.values()];
}

export async function fetchFuelStationsNearPoints(
  points: LatLon[],
  radiusM: number = POI_SEARCH_RADIUS_M,
  signal?: AbortSignal,
): Promise<PoiPlace[]> {
  if (points.length === 0) {
    return [];
  }

  const elements = await queryOverpass(
    buildOverpassQuery(points, radiusM, [{ key: "amenity", value: "fuel" }]),
    signal,
  );

  return dedupePlaces(elements, parseFuelStation);
}

export async function fetchHotelsNearPoints(
  points: LatLon[],
  radiusM: number = POI_SEARCH_RADIUS_M,
  signal?: AbortSignal,
): Promise<PoiPlace[]> {
  if (points.length === 0) {
    return [];
  }

  const elements = await queryOverpass(
    buildOverpassQuery(points, radiusM, HOTEL_TAG_FILTERS),
    signal,
  );

  return dedupePlaces(elements, parseHotel);
}

export async function fetchFuelStationsNearPoint(
  point: LatLon,
  radiusM: number = POI_SEARCH_RADIUS_M,
  signal?: AbortSignal,
): Promise<PoiPlace[]> {
  try {
    return await fetchFuelStationsNearPoints([point], radiusM, signal);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    return [];
  }
}
