import { OFF_ROUTE_THRESHOLD_KM } from "@/lib/poi/constants";
import { refreshItineraryMetrics } from "@/lib/poi/refresh-itinerary-metrics";
import { fetchOsrmRouteThrough } from "@/lib/routing/osrm-client";
import type { Itinerary, LatLon, RouteStop } from "@/lib/route-engine";
import {
  appendPolyline,
  cumulativeDistances,
  interpolateAtDistance,
  isOffRoute,
  roundDistanceKm,
  slicePolylineByDistance,
} from "@/lib/route-engine/geo";

type DetourSpec = {
  anchorKm: number;
  stop: RouteStop;
};

type DetourGeometry = {
  anchorKm: number;
  geometry: LatLon[];
};

function collectDetourSpecs(
  itinerary: Itinerary,
  mainPolyline: LatLon[],
  mainCumulative: number[],
): DetourSpec[] {
  return itinerary.stops
    .filter((stop) => stop.kind === "rest" || stop.kind === "overnight")
    .filter((stop) => Boolean(stop.placeName))
    .filter((stop) =>
      isOffRoute(
        mainPolyline,
        mainCumulative,
        { lat: stop.lat, lon: stop.lon },
        OFF_ROUTE_THRESHOLD_KM,
      ),
    )
    .map((stop) => ({
      anchorKm: stop.anchorDistanceKm ?? stop.distanceFromStartKm,
      stop,
    }))
    .sort((a, b) => a.anchorKm - b.anchorKm);
}

function buildPolylineWithDetours(
  mainPolyline: LatLon[],
  detours: DetourGeometry[],
): LatLon[] {
  const sorted = [...detours].sort((a, b) => a.anchorKm - b.anchorKm);
  const mainCumulative = cumulativeDistances(mainPolyline);
  const totalKm = mainCumulative[mainCumulative.length - 1] ?? 0;

  let result: LatLon[] = [];
  let lastKm = 0;

  for (const detour of sorted) {
    result = appendPolyline(
      result,
      slicePolylineByDistance(
        mainPolyline,
        mainCumulative,
        lastKm,
        detour.anchorKm,
      ),
    );
    result = appendPolyline(result, detour.geometry);
    lastKm = detour.anchorKm;
  }

  return appendPolyline(
    result,
    slicePolylineByDistance(mainPolyline, mainCumulative, lastKm, totalKm),
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function applyDetoursToItinerary(
  itinerary: Itinerary,
  mainPolyline: LatLon[],
  signal?: AbortSignal,
): Promise<Itinerary> {
  const mainCumulative = cumulativeDistances(mainPolyline);
  const detourSpecs = collectDetourSpecs(
    itinerary,
    mainPolyline,
    mainCumulative,
  );

  if (detourSpecs.length === 0) {
    return itinerary;
  }

  const detourGeometries: DetourGeometry[] = [];

  for (const spec of detourSpecs) {
    const anchor = interpolateAtDistance(
      mainPolyline,
      mainCumulative,
      spec.anchorKm,
    );
    const poi = { lat: spec.stop.lat, lon: spec.stop.lon };
    const result = await fetchOsrmRouteThrough([anchor, poi, anchor], signal);

    if (result.ok && result.polyline.length >= 2) {
      detourGeometries.push({
        anchorKm: spec.anchorKm,
        geometry: result.polyline,
      });
    }
  }

  if (detourGeometries.length === 0) {
    return itinerary;
  }

  itinerary.polyline = buildPolylineWithDetours(mainPolyline, detourGeometries);
  itinerary.totalDistanceKm = roundDistanceKm(
    cumulativeDistances(itinerary.polyline).at(-1) ?? itinerary.totalDistanceKm,
  );
  refreshItineraryMetrics(itinerary);

  return itinerary;
}

export async function enrichItineraryWithPoiDetours(
  itinerary: Itinerary,
  mainPolyline: LatLon[],
  signal?: AbortSignal,
): Promise<Itinerary> {
  try {
    return await applyDetoursToItinerary(itinerary, mainPolyline, signal);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    return itinerary;
  }
}
