export type LatLon = {
  lat: number;
  lon: number;
};

export type StopKind = "start" | "rest" | "overnight" | "end";

export type RouteStop = {
  kind: StopKind;
  lat: number;
  lon: number;
  distanceFromStartKm: number;
  dayIndex: number;
  /** POI name when snapped to a fuel station or hotel. */
  placeName?: string | null;
  /** Distance on the main route spine where a detour leaves and returns. */
  anchorDistanceKm?: number | null;
};

export type TravelDay = {
  dayIndex: number;
  distanceKm: number;
  stops: RouteStop[];
  polyline: LatLon[];
};

export type Itinerary = {
  totalDistanceKm: number;
  totalDays: number;
  restStopCount: number;
  stops: RouteStop[];
  days: TravelDay[];
  polyline: LatLon[];
};

export type SegmentInput = {
  polyline: LatLon[];
  restKm: number;
  dayKm: number;
};

export type SegmentationErrorCode = "INVALID_POLYLINE" | "INVALID_CONSTRAINTS";

export type SegmentationError = {
  code: SegmentationErrorCode;
  message: string;
};

export type SegmentResult =
  | { ok: true; itinerary: Itinerary }
  | { ok: false; error: SegmentationError };

export type RawStop = {
  kind: StopKind;
  lat: number;
  lon: number;
  distanceFromStartKm: number;
};
