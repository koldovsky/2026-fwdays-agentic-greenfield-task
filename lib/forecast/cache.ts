// LRU cache for ForecastResponse, keyed by "lat,lon". Max 5 entries.
// Framework-free (TC-PURE-01). Module-level singleton — survives route
// re-renders but resets on full page reload (in-memory only, FR-FORECAST-05).

import type { ForecastResponse } from "./types";

const MAX = 5;
const cache = new Map<string, ForecastResponse>();

export function cacheKey(lat: string, lon: string): string {
  return `${lat},${lon}`;
}

export function getCached(key: string): ForecastResponse | undefined {
  if (!cache.has(key)) return undefined;
  // Move to end (most-recently-used).
  const value = cache.get(key)!;
  cache.delete(key);
  cache.set(key, value);
  return value;
}

export function setCached(key: string, value: ForecastResponse): void {
  if (cache.has(key)) cache.delete(key);
  if (cache.size >= MAX) {
    // Evict oldest (first) entry.
    cache.delete(cache.keys().next().value!);
  }
  cache.set(key, value);
}
