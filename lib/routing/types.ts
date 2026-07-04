import type { Itinerary } from "@/lib/route-engine";
import type { LatLon } from "@/lib/route-engine";

export type RoutingErrorCode =
  | "INVALID_CONFIG"
  | "HTTP_ERROR"
  | "NO_ROUTE"
  | "INVALID_GEOMETRY"
  | "SEGMENTATION_FAILED"
  | "ABORTED"
  | "NETWORK_ERROR";

export type RoutingError = {
  code: RoutingErrorCode;
  message: string;
};

export type OsrmGeoJsonGeometry = {
  type: "LineString";
  coordinates: [number, number][];
};

export type OsrmRoute = {
  geometry: OsrmGeoJsonGeometry;
  distance: number;
  duration: number;
};

export type OsrmRouteResponse = {
  code: string;
  routes?: OsrmRoute[];
};

export type FetchOsrmResult =
  | { ok: true; polyline: LatLon[] }
  | { ok: false; error: RoutingError };

export type PlanRouteResult =
  | { ok: true; itinerary: Itinerary }
  | { ok: false; error: RoutingError };
