import type { CityLocation } from "@/lib/city-search/geocoding";

export const MAX_PINNED_CITIES = 3;

export function locationKey(location: Pick<CityLocation, "latitude" | "longitude">): string {
  return `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
}

export function isSameLocation(
  left: Pick<CityLocation, "latitude" | "longitude">,
  right: Pick<CityLocation, "latitude" | "longitude">,
): boolean {
  return locationKey(left) === locationKey(right);
}

export function isPinned(
  pinnedCities: readonly CityLocation[],
  location: CityLocation,
): boolean {
  return pinnedCities.some((city) => isSameLocation(city, location));
}

export function canPinCity(pinnedCities: readonly CityLocation[]): boolean {
  return pinnedCities.length < MAX_PINNED_CITIES;
}

export function addPinnedCity(
  pinnedCities: readonly CityLocation[],
  location: CityLocation,
): CityLocation[] {
  if (isPinned(pinnedCities, location) || !canPinCity(pinnedCities)) {
    return [...pinnedCities];
  }

  return [...pinnedCities, location];
}

export function removePinnedCity(
  pinnedCities: readonly CityLocation[],
  location: CityLocation,
): CityLocation[] {
  return pinnedCities.filter((city) => !isSameLocation(city, location));
}
