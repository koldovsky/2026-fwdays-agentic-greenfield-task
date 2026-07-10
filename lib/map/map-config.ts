import type { CityLocation } from "@/lib/city-search/geocoding";

export const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
export const DEFAULT_MAP_ZOOM = 11;
export const MAP_MIN_HEIGHT_PX = 320;

export function getMapCenter(location: Pick<CityLocation, "latitude" | "longitude">): [
  number,
  number,
] {
  return [location.latitude, location.longitude];
}

export function getMarkerPopupLabel(location: Pick<CityLocation, "name" | "label">): string {
  return location.label || location.name;
}

export function getMapSkeletonClassName(): string {
  return "min-h-[320px] w-full rounded-[1.25rem]";
}
