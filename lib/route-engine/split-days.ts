import {
  interpolateAtDistance,
  roundDistanceKm,
  slicePolylineByDistance,
} from "./geo";
import type { LatLon, RawStop, RouteStop, TravelDay } from "./types";

function createStop(
  kind: RouteStop["kind"],
  lat: number,
  lon: number,
  distanceFromStartKm: number,
  dayIndex: number,
): RouteStop {
  return {
    kind,
    lat,
    lon,
    distanceFromStartKm,
    dayIndex,
  };
}

function closeDay(
  days: TravelDay[],
  dayIndex: number,
  dayStartKm: number,
  dayEndKm: number,
  dayStops: RouteStop[],
  polyline: LatLon[],
  cumulative: number[],
): void {
  days.push({
    dayIndex,
    distanceKm: roundDistanceKm(dayEndKm - dayStartKm),
    stops: [...dayStops],
    polyline: slicePolylineByDistance(polyline, cumulative, dayStartKm, dayEndKm),
  });
}

export function splitDays(
  baseStops: RawStop[],
  polyline: LatLon[],
  cumulative: number[],
  dayKm: number,
): { stops: RouteStop[]; days: TravelDay[] } {
  const days: TravelDay[] = [];
  const stops: RouteStop[] = [];

  let dayIndex = 0;
  let dayStartKm = 0;
  let distanceInDayKm = 0;
  let previousDistanceKm = 0;
  let dayStops: RouteStop[] = [];

  for (const baseStop of baseStops) {
    if (baseStop.kind === "start") {
      const startStop = createStop(
        "start",
        baseStop.lat,
        baseStop.lon,
        baseStop.distanceFromStartKm,
        dayIndex,
      );
      dayStops.push(startStop);
      stops.push(startStop);
      previousDistanceKm = baseStop.distanceFromStartKm;
      continue;
    }

    let legKm = baseStop.distanceFromStartKm - previousDistanceKm;

    while (distanceInDayKm + legKm > dayKm + Number.EPSILON) {
      const overnightKm = dayStartKm + dayKm;
      const overnightPoint = interpolateAtDistance(
        polyline,
        cumulative,
        overnightKm,
      );
      const overnightStop = createStop(
        "overnight",
        overnightPoint.lat,
        overnightPoint.lon,
        overnightKm,
        dayIndex,
      );

      dayStops.push(overnightStop);
      stops.push(overnightStop);
      closeDay(days, dayIndex, dayStartKm, overnightKm, dayStops, polyline, cumulative);

      dayIndex += 1;
      dayStartKm = overnightKm;
      distanceInDayKm = 0;
      dayStops = [];
      previousDistanceKm = overnightKm;
      legKm = baseStop.distanceFromStartKm - previousDistanceKm;
    }

    const stop = createStop(
      baseStop.kind,
      baseStop.lat,
      baseStop.lon,
      baseStop.distanceFromStartKm,
      dayIndex,
    );
    dayStops.push(stop);
    stops.push(stop);
    distanceInDayKm += legKm;
    previousDistanceKm = baseStop.distanceFromStartKm;
  }

  const totalDistanceKm = cumulative[cumulative.length - 1] ?? dayStartKm;
  closeDay(
    days,
    dayIndex,
    dayStartKm,
    totalDistanceKm,
    dayStops,
    polyline,
    cumulative,
  );

  return { stops, days };
}
