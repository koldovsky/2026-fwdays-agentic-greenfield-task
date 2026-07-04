import { segmentRoute } from "@/lib/route-engine";
import type { RouteConfig } from "@/lib/route-config/types";
import { enrichItineraryWithPoiDetours } from "@/lib/poi/apply-detours";
import { snapStopsToPoi } from "@/lib/poi/snap-stops-to-poi";

import { fetchOsrmRoute } from "./osrm-client";
import type { PlanRouteResult } from "./types";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function planRoute(
  config: RouteConfig,
  signal?: AbortSignal,
): Promise<PlanRouteResult> {
  if (!config.start || !config.end) {
    return {
      ok: false,
      error: {
        code: "INVALID_CONFIG",
        message: "Start and end locations are required.",
      },
    };
  }

  const osrmResult = await fetchOsrmRoute(config.start, config.end, signal);

  if (!osrmResult.ok) {
    return osrmResult;
  }

  const mainPolyline = osrmResult.polyline;

  const segmentResult = segmentRoute({
    polyline: mainPolyline,
    restKm: config.restKm,
    dayKm: config.dayKm,
  });

  if (!segmentResult.ok) {
    return {
      ok: false,
      error: {
        code: "SEGMENTATION_FAILED",
        message: segmentResult.error.message,
      },
    };
  }

  try {
    await snapStopsToPoi(segmentResult.itinerary, mainPolyline, signal);
    await enrichItineraryWithPoiDetours(
      segmentResult.itinerary,
      mainPolyline,
      signal,
    );
  } catch (error) {
    if (isAbortError(error)) {
      return {
        ok: false,
        error: {
          code: "ABORTED",
          message: "Route planning was aborted.",
        },
      };
    }
  }

  return {
    ok: true,
    itinerary: segmentResult.itinerary,
  };
}
