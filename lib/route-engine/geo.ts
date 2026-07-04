import type { LatLon } from "./types";

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineKm(a: LatLon, b: LatLon): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function cumulativeDistances(polyline: LatLon[]): number[] {
  const cumulative = [0];

  for (let i = 1; i < polyline.length; i++) {
    cumulative.push(
      cumulative[i - 1] + haversineKm(polyline[i - 1], polyline[i]),
    );
  }

  return cumulative;
}

function findSegmentIndex(cumulative: number[], targetKm: number): number {
  let low = 0;
  let high = cumulative.length - 1;

  while (low < high - 1) {
    const mid = Math.floor((low + high) / 2);
    if (cumulative[mid] <= targetKm) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return low;
}

export function interpolateAtDistance(
  polyline: LatLon[],
  cumulative: number[],
  targetKm: number,
): LatLon {
  if (targetKm <= 0) {
    return { ...polyline[0] };
  }

  const total = cumulative[cumulative.length - 1] ?? 0;
  if (targetKm >= total) {
    return { ...polyline[polyline.length - 1] };
  }

  const segmentIndex = findSegmentIndex(cumulative, targetKm);
  const segmentStartKm = cumulative[segmentIndex];
  const segmentEndKm = cumulative[segmentIndex + 1];
  const segmentLengthKm = segmentEndKm - segmentStartKm;
  const ratio =
    segmentLengthKm === 0 ? 0 : (targetKm - segmentStartKm) / segmentLengthKm;

  const from = polyline[segmentIndex];
  const to = polyline[segmentIndex + 1];

  return {
    lat: from.lat + ratio * (to.lat - from.lat),
    lon: from.lon + ratio * (to.lon - from.lon),
  };
}

export function slicePolylineByDistance(
  polyline: LatLon[],
  cumulative: number[],
  startKm: number,
  endKm: number,
): LatLon[] {
  if (startKm >= endKm) {
    return [];
  }

  const slice: LatLon[] = [
    interpolateAtDistance(polyline, cumulative, startKm),
  ];

  for (let i = 0; i < polyline.length; i++) {
    const distance = cumulative[i];
    if (distance > startKm && distance < endKm) {
      slice.push({ ...polyline[i] });
    }
  }

  const endPoint = interpolateAtDistance(polyline, cumulative, endKm);
  const last = slice[slice.length - 1];

  if (
    last.lat !== endPoint.lat ||
    last.lon !== endPoint.lon
  ) {
    slice.push(endPoint);
  }

  return slice;
}

export function roundDistanceKm(distanceKm: number): number {
  return Math.round(distanceKm * 10) / 10;
}

export function appendPolyline(base: LatLon[], extra: LatLon[]): LatLon[] {
  if (extra.length === 0) {
    return base;
  }

  if (base.length === 0) {
    return [...extra];
  }

  const merged = [...base];

  for (const point of extra) {
    const last = merged[merged.length - 1];
    if (last.lat !== point.lat || last.lon !== point.lon) {
      merged.push(point);
    }
  }

  return merged;
}

export function isOffRoute(
  polyline: LatLon[],
  cumulative: number[],
  point: LatLon,
  thresholdKm = 0.05,
): boolean {
  const projection = projectOntoPolyline(polyline, cumulative, point);
  return haversineKm(point, projection.point) > thresholdKm;
}

export function closestPointOnSegment(
  a: LatLon,
  b: LatLon,
  p: LatLon,
): { point: LatLon; t: number } {
  const dx = b.lon - a.lon;
  const dy = b.lat - a.lat;

  if (dx === 0 && dy === 0) {
    return { point: { ...a }, t: 0 };
  }

  const t = Math.max(
    0,
    Math.min(1, ((p.lon - a.lon) * dx + (p.lat - a.lat) * dy) / (dx * dx + dy * dy)),
  );

  return {
    point: {
      lat: a.lat + t * dy,
      lon: a.lon + t * dx,
    },
    t,
  };
}

export type PolylineProjection = {
  point: LatLon;
  distanceKm: number;
};

/** Projects a point onto the route polyline and returns the closest point and distance from start. */
export function projectOntoPolyline(
  polyline: LatLon[],
  cumulative: number[],
  point: LatLon,
): PolylineProjection {
  if (polyline.length === 0) {
    return { point, distanceKm: 0 };
  }

  if (polyline.length === 1) {
    return { point: { ...polyline[0] }, distanceKm: 0 };
  }

  let bestPoint = polyline[0];
  let bestDistanceKm = 0;
  let bestOffsetKm = Infinity;

  for (let i = 0; i < polyline.length - 1; i++) {
    const projected = closestPointOnSegment(polyline[i], polyline[i + 1], point);
    const offsetKm = haversineKm(point, projected.point);

    if (offsetKm < bestOffsetKm) {
      bestOffsetKm = offsetKm;
      bestPoint = projected.point;
      const segmentLengthKm = cumulative[i + 1] - cumulative[i];
      bestDistanceKm = cumulative[i] + projected.t * segmentLengthKm;
    }
  }

  return {
    point: bestPoint,
    distanceKm: bestDistanceKm,
  };
}
