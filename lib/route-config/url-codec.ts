import { DEFAULT_DAY_KM, DEFAULT_REST_KM, defaultRouteConfig } from "./defaults";
import type { GeocodedPlace, RouteConfig } from "./types";
import { dayKmFromInput, restKmFromInput } from "./validation";

function encodePlaceParam(place: GeocodedPlace): string {
  return `${place.lat},${place.lon},${place.name}`;
}

function decodePlaceParam(value: string | null): GeocodedPlace | null {
  if (!value) {
    return null;
  }

  const firstComma = value.indexOf(",");
  const secondComma = value.indexOf(",", firstComma + 1);
  if (firstComma === -1 || secondComma === -1) {
    return null;
  }

  const lat = Number.parseFloat(value.slice(0, firstComma));
  const lon = Number.parseFloat(value.slice(firstComma + 1, secondComma));
  const name = value.slice(secondComma + 1).trim();

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !name) {
    return null;
  }

  return {
    id: `${lat},${lon}`,
    name,
    region: "",
    country: "",
    lat,
    lon,
  };
}

export function decodeRouteConfig(
  params: Pick<URLSearchParams, "get">,
): RouteConfig {
  const defaults = defaultRouteConfig();
  const start = decodePlaceParam(params.get("start"));
  const end = decodePlaceParam(params.get("end"));
  const restRaw = params.get("rest");
  const dayRaw = params.get("day");

  return {
    start,
    end,
    restKm: restRaw ? restKmFromInput(restRaw) : defaults.restKm,
    dayKm: dayRaw ? dayKmFromInput(dayRaw) : defaults.dayKm,
  };
}

export function encodeRouteConfig(config: RouteConfig): URLSearchParams {
  const params = new URLSearchParams();

  if (config.start) {
    params.set("start", encodePlaceParam(config.start));
  }
  if (config.end) {
    params.set("end", encodePlaceParam(config.end));
  }
  if (config.restKm !== DEFAULT_REST_KM) {
    params.set("rest", String(config.restKm));
  }
  if (config.dayKm !== DEFAULT_DAY_KM) {
    params.set("day", String(config.dayKm));
  }

  return params;
}

export function routeConfigToPath(config: RouteConfig): string {
  const params = encodeRouteConfig(config);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}
