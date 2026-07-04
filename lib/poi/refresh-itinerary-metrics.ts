import type { Itinerary, RouteStop, StopKind } from "@/lib/route-engine";
import {
  cumulativeDistances,
  projectOntoPolyline,
  roundDistanceKm,
  slicePolylineByDistance,
} from "@/lib/route-engine/geo";

export function refreshItineraryMetrics(itinerary: Itinerary): void {
  const cumulative = cumulativeDistances(itinerary.polyline);
  itinerary.totalDistanceKm = roundDistanceKm(
    cumulative[cumulative.length - 1] ?? 0,
  );

  const updateStopDistance = (stop: RouteStop) => {
    stop.distanceFromStartKm = roundDistanceKm(
      projectOntoPolyline(itinerary.polyline, cumulative, stop).distanceKm,
    );
  };

  for (const stop of itinerary.stops) {
    updateStopDistance(stop);
  }

  for (const day of itinerary.days) {
    for (const stop of day.stops) {
      updateStopDistance(stop);
    }
  }

  let previousEndKm = 0;

  for (let index = 0; index < itinerary.days.length; index++) {
    const day = itinerary.days[index];
    const startKm = previousEndKm;
    const overnight = day.stops.find((stop) => stop.kind === "overnight");
    const endKm =
      index === itinerary.days.length - 1
        ? itinerary.totalDistanceKm
        : (overnight?.distanceFromStartKm ?? itinerary.totalDistanceKm);

    day.distanceKm = roundDistanceKm(endKm - startKm);
    day.polyline = slicePolylineByDistance(
      itinerary.polyline,
      cumulative,
      startKm,
      endKm,
    );
    previousEndKm = endKm;
  }
}

export function applyStopUpdates(
  itinerary: Itinerary,
  updates: Map<number, Partial<RouteStop>>,
  kinds: StopKind[],
): void {
  const kindSet = new Set(kinds);

  const applyToStop = (stop: RouteStop) => {
    if (!kindSet.has(stop.kind)) {
      return;
    }

    const update = updates.get(stop.distanceFromStartKm);
    if (!update) {
      return;
    }

    if (update.lat != null) {
      stop.lat = update.lat;
    }
    if (update.lon != null) {
      stop.lon = update.lon;
    }
    if (update.placeName != null) {
      stop.placeName = update.placeName;
    }
    if (update.anchorDistanceKm != null) {
      stop.anchorDistanceKm = update.anchorDistanceKm;
    }
    if (update.distanceFromStartKm != null) {
      stop.distanceFromStartKm = update.distanceFromStartKm;
    }
  };

  for (const stop of itinerary.stops) {
    applyToStop(stop);
  }

  for (const day of itinerary.days) {
    for (const stop of day.stops) {
      applyToStop(stop);
    }
  }
}
