import { uk } from "@/lib/i18n/uk";

export const shellContent = uk.shell;

export const shellLayoutRegions = {
  mobile: ["hero-search", "forecast-placeholder", "map-placeholder"],
  tablet: ["forecast-placeholder", "map-placeholder"],
  desktop: ["side-panel", "forecast-placeholder", "map-placeholder"],
} as const;
