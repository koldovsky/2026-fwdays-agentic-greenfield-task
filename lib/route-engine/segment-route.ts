import { cumulativeDistances, roundDistanceKm } from "./geo";
import { placeRestStops } from "./place-rest-stops";
import { splitDays } from "./split-days";
import type {
  SegmentInput,
  SegmentResult,
  SegmentationError,
} from "./types";

function invalidPolyline(message: string): SegmentationError {
  return { code: "INVALID_POLYLINE", message };
}

function invalidConstraints(message: string): SegmentationError {
  return { code: "INVALID_CONSTRAINTS", message };
}

function validateInput(input: SegmentInput): SegmentationError | null {
  if (!input.polyline || input.polyline.length < 2) {
    return invalidPolyline("Polyline must contain at least two coordinates.");
  }

  if (input.restKm <= 0 || input.dayKm <= 0) {
    return invalidConstraints("Rest and daily limits must be positive.");
  }

  for (const point of input.polyline) {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) {
      return invalidPolyline("Polyline coordinates must be finite numbers.");
    }
  }

  return null;
}

export function segmentRoute(input: SegmentInput): SegmentResult {
  const validationError = validateInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const cumulative = cumulativeDistances(input.polyline);
  const totalDistanceKm = cumulative[cumulative.length - 1] ?? 0;
  const baseStops = placeRestStops(
    input.polyline,
    cumulative,
    input.restKm,
    input.dayKm,
  );
  const { stops, days } = splitDays(
    baseStops,
    input.polyline,
    cumulative,
    input.dayKm,
  );

  const restStopCount = stops.filter((stop) => stop.kind === "rest").length;

  return {
    ok: true,
    itinerary: {
      totalDistanceKm: roundDistanceKm(totalDistanceKm),
      totalDays: days.length,
      restStopCount,
      stops,
      days,
      polyline: input.polyline,
    },
  };
}
