import { FALLBACK_FUEL_STATION_NAME } from "@/lib/poi/constants";
import type { OverpassElement, PoiPlace } from "@/lib/poi/types";

export function formatFuelStationName(tags: Record<string, string> = {}): string {
  return (
    tags.name?.trim() ||
    tags["name:uk"]?.trim() ||
    tags.brand?.trim() ||
    FALLBACK_FUEL_STATION_NAME
  );
}

export function parseFuelStation(element: OverpassElement): PoiPlace | null {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;

  if (lat == null || lon == null) {
    return null;
  }

  return {
    id: `${element.type}/${element.id}`,
    lat,
    lon,
    name: formatFuelStationName(element.tags),
  };
}
