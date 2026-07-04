import type { GeocodedPlace } from "@/lib/route-config/types";
import type { LatLon } from "@/lib/route-engine";

import { decodeOsrmGeometry } from "./decode-geometry";
import type { FetchOsrmResult, OsrmRouteResponse } from "./types";

const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";

function buildOsrmUrl(points: Array<{ lon: number; lat: number }>): string {
  const coordinates = points.map((point) => `${point.lon},${point.lat}`).join(";");
  const params = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    steps: "false",
  });

  return `${OSRM_BASE_URL}/${coordinates}?${params.toString()}`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function fetchOsrmPolyline(
  points: LatLon[],
  signal?: AbortSignal,
): Promise<FetchOsrmResult> {
  if (points.length < 2) {
    return {
      ok: false,
      error: {
        code: "INVALID_GEOMETRY",
        message: "At least two coordinates are required.",
      },
    };
  }

  try {
    const response = await fetch(buildOsrmUrl(points), { signal });

    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: "HTTP_ERROR",
          message: "OSRM request failed.",
        },
      };
    }

    const data = (await response.json()) as OsrmRouteResponse;

    if (data.code !== "Ok" || !data.routes?.length) {
      return {
        ok: false,
        error: {
          code: "NO_ROUTE",
          message: "OSRM returned no route.",
        },
      };
    }

    const polyline = decodeOsrmGeometry(data.routes[0].geometry);

    if (!polyline) {
      return {
        ok: false,
        error: {
          code: "INVALID_GEOMETRY",
          message: "OSRM geometry could not be decoded.",
        },
      };
    }

    return { ok: true, polyline };
  } catch (error) {
    if (isAbortError(error)) {
      return {
        ok: false,
        error: {
          code: "ABORTED",
          message: "OSRM request was aborted.",
        },
      };
    }

    return {
      ok: false,
      error: {
        code: "NETWORK_ERROR",
        message: "OSRM request could not complete.",
      },
    };
  }
}

export async function fetchOsrmRouteThrough(
  points: LatLon[],
  signal?: AbortSignal,
): Promise<FetchOsrmResult> {
  return fetchOsrmPolyline(points, signal);
}

export async function fetchOsrmRoute(
  start: GeocodedPlace,
  end: GeocodedPlace,
  signal?: AbortSignal,
): Promise<FetchOsrmResult> {
  return fetchOsrmPolyline(
    [
      { lat: start.lat, lon: start.lon },
      { lat: end.lat, lon: end.lon },
    ],
    signal,
  );
}
