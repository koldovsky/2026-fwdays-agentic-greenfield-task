import type { RouteConfig } from "./types";

export const DEFAULT_REST_KM = 150;
export const DEFAULT_DAY_KM = 400;

export function defaultRouteConfig(): RouteConfig {
  return {
    start: null,
    end: null,
    restKm: DEFAULT_REST_KM,
    dayKm: DEFAULT_DAY_KM,
  };
}
