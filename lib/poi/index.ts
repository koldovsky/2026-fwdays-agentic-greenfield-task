export {
  FUEL_SEARCH_RADIUS_M,
  FALLBACK_FUEL_STATION_NAME,
  FALLBACK_HOTEL_NAME,
  HOTEL_SEARCH_RADIUS_M,
  OFF_ROUTE_THRESHOLD_KM,
  POI_SEARCH_RADIUS_M,
} from "@/lib/poi/constants";
export { formatFuelStationName, parseFuelStation } from "@/lib/poi/format-fuel-station-name";
export { formatHotelName, parseHotel } from "@/lib/poi/format-hotel-name";
export {
  fetchFuelStationsNearPoint,
  fetchFuelStationsNearPoints,
  fetchHotelsNearPoints,
} from "@/lib/poi/overpass-client";
export {
  pickNearestFuelStation,
  pickNearestPlace,
} from "@/lib/poi/pick-nearest-place";
export { enrichItineraryWithPoiDetours, applyDetoursToItinerary } from "@/lib/poi/apply-detours";
export {
  snapRestStopsToGasStations,
  snapStopsToPoi,
} from "@/lib/poi/snap-stops-to-poi";
export {
  applyStopUpdates,
  refreshItineraryMetrics,
} from "@/lib/poi/refresh-itinerary-metrics";
export type { FuelStation, OverpassElement, OverpassResponse, PoiPlace } from "@/lib/poi/types";
