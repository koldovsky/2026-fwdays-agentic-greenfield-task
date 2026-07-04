import { POI_SEARCH_RADIUS_M } from "@/lib/poi/constants";
import {
  fetchFuelStationsNearPoints,
  fetchHotelsNearPoints,
} from "@/lib/poi/overpass-client";
import { pickNearestPlace } from "@/lib/poi/pick-nearest-place";
import {
  applyStopUpdates,
} from "@/lib/poi/refresh-itinerary-metrics";
import type { Itinerary, LatLon, RouteStop } from "@/lib/route-engine";
import { roundDistanceKm } from "@/lib/route-engine/geo";
import type { PoiPlace } from "@/lib/poi/types";

type StopSnapUpdate = Pick<
  RouteStop,
  "lat" | "lon" | "placeName" | "anchorDistanceKm" | "distanceFromStartKm"
>;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function snapStopsToPlaces(
  itinerary: Itinerary,
  stops: RouteStop[],
  kind: RouteStop["kind"],
  fetchPlaces: (
    points: LatLon[],
    radiusM: number,
    signal?: AbortSignal,
  ) => Promise<PoiPlace[]>,
  signal?: AbortSignal,
): Promise<void> {
  if (stops.length === 0) {
    return;
  }

  const idealPoints = stops.map((stop) => ({
    lat: stop.lat,
    lon: stop.lon,
  }));

  let places;
  try {
    places = await fetchPlaces(idealPoints, POI_SEARCH_RADIUS_M, signal);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    return;
  }

  if (places.length === 0) {
    return;
  }

  const maxRadiusKm = POI_SEARCH_RADIUS_M / 1000;
  const updates = new Map<number, StopSnapUpdate>();

  for (const stop of stops) {
    const idealKm = stop.distanceFromStartKm;
    const nearest = pickNearestPlace(
      { lat: stop.lat, lon: stop.lon },
      places,
      maxRadiusKm,
    );

    if (!nearest) {
      continue;
    }

    updates.set(idealKm, {
      lat: nearest.lat,
      lon: nearest.lon,
      placeName: nearest.name,
      anchorDistanceKm: idealKm,
      distanceFromStartKm: roundDistanceKm(idealKm),
    });
  }

  applyStopUpdates(itinerary, updates, [kind]);
}

export async function snapStopsToPoi(
  itinerary: Itinerary,
  _mainPolyline: LatLon[],
  signal?: AbortSignal,
): Promise<Itinerary> {
  const restStops = itinerary.stops.filter((stop) => stop.kind === "rest");
  const overnightStops = itinerary.stops.filter(
    (stop) => stop.kind === "overnight",
  );

  await snapStopsToPlaces(
    itinerary,
    restStops,
    "rest",
    fetchFuelStationsNearPoints,
    signal,
  );
  await snapStopsToPlaces(
    itinerary,
    overnightStops,
    "overnight",
    fetchHotelsNearPoints,
    signal,
  );

  return itinerary;
}

/** @deprecated Use snapStopsToPoi */
export async function snapRestStopsToGasStations(
  itinerary: Itinerary,
  signal?: AbortSignal,
): Promise<Itinerary> {
  return snapStopsToPoi(itinerary, itinerary.polyline, signal);
}
