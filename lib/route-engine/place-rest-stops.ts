import { interpolateAtDistance } from "./geo";
import type { LatLon, RawStop } from "./types";

/** Overnight anchor distances along the route, aligned with splitDays day boundaries. */
export function computeOvernightAnchors(
  totalDistanceKm: number,
  dayKm: number,
): number[] {
  const anchors: number[] = [];
  let km = dayKm;

  while (km < totalDistanceKm - Number.EPSILON) {
    anchors.push(km);
    km += dayKm;
  }

  return anchors;
}

export function placeRestStops(
  polyline: LatLon[],
  cumulative: number[],
  restKm: number,
  dayKm: number,
): RawStop[] {
  const totalDistanceKm = cumulative[cumulative.length - 1] ?? 0;
  const stops: RawStop[] = [
    {
      kind: "start",
      lat: polyline[0].lat,
      lon: polyline[0].lon,
      distanceFromStartKm: 0,
    },
  ];

  const overnightAnchors = computeOvernightAnchors(totalDistanceKm, dayKm);
  const segmentBoundaries = [0, ...overnightAnchors, totalDistanceKm];

  for (let index = 0; index < segmentBoundaries.length - 1; index++) {
    const segmentStartKm = segmentBoundaries[index];
    const segmentEndKm = segmentBoundaries[index + 1];
    let nextRestKm = segmentStartKm + restKm;

    while (nextRestKm < segmentEndKm - Number.EPSILON) {
      const remainderKm = segmentEndKm - nextRestKm;

      if (remainderKm < restKm / 2) {
        break;
      }

      const point = interpolateAtDistance(polyline, cumulative, nextRestKm);
      stops.push({
        kind: "rest",
        lat: point.lat,
        lon: point.lon,
        distanceFromStartKm: nextRestKm,
      });
      nextRestKm += restKm;
    }
  }

  stops.push({
    kind: "end",
    lat: polyline[polyline.length - 1].lat,
    lon: polyline[polyline.length - 1].lon,
    distanceFromStartKm: totalDistanceKm,
  });

  return stops;
}
