import type { LatLon } from "@/lib/route-engine/types";

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function destinationPoint(
  from: LatLon,
  bearingDeg: number,
  distanceKm: number,
): LatLon {
  const angularDistance = distanceKm / EARTH_RADIUS_KM;
  const bearing = toRadians(bearingDeg);
  const lat1 = toRadians(from.lat);
  const lon1 = toRadians(from.lon);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    lat: toDegrees(lat2),
    lon: toDegrees(lon2),
  };
}

export function buildPolylineAlongBearing(
  start: LatLon,
  bearingDeg: number,
  segmentKm: number,
  segmentCount: number,
): LatLon[] {
  const polyline: LatLon[] = [{ ...start }];

  for (let i = 0; i < segmentCount; i++) {
    const next = destinationPoint(polyline[i], bearingDeg, segmentKm);
    polyline.push(next);
  }

  return polyline;
}

export const FIXTURE_START: LatLon = { lat: 50, lon: 30 };

export function straightPolyline(totalKm: number, segmentKm = 1): LatLon[] {
  const segmentCount = Math.max(1, Math.round(totalKm / segmentKm));
  return buildPolylineAlongBearing(FIXTURE_START, 0, segmentKm, segmentCount);
}

export function curvedPolyline(pointCount: number, segmentKm = 2): LatLon[] {
  const polyline: LatLon[] = [{ ...FIXTURE_START }];
  let bearing = 45;

  for (let i = 1; i < pointCount; i++) {
    bearing = (bearing + 2) % 360;
    polyline.push(destinationPoint(polyline[i - 1], bearing, segmentKm));
  }

  return polyline;
}

export function densePolyline(pointCount = 2000, segmentKm = 0.5): LatLon[] {
  return buildPolylineAlongBearing(
    FIXTURE_START,
    0,
    segmentKm,
    pointCount - 1,
  );
}
