/** Search radius around an ideal stop when looking for fuel stations or hotels. */
export const POI_SEARCH_RADIUS_M = 20_000;

/** @deprecated Use POI_SEARCH_RADIUS_M */
export const FUEL_SEARCH_RADIUS_M = POI_SEARCH_RADIUS_M;

export const HOTEL_SEARCH_RADIUS_M = POI_SEARCH_RADIUS_M;

export const OVERPASS_API_URL = "https://overpass-api.de/api/interpreter";

export const FALLBACK_FUEL_STATION_NAME = "АЗС";

export const FALLBACK_HOTEL_NAME = "Готель";

/** Minimum offset from the main route before inserting a detour leg. */
export const OFF_ROUTE_THRESHOLD_KM = 0.05;
