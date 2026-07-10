import {
  buildForecastUrl,
  ForecastMemoryCache,
  normalizeForecastResponse,
  type ForecastLocation,
  type ForecastViewModel,
  type OpenMeteoForecastResponse,
} from "./forecast";

const cache = new ForecastMemoryCache<ForecastViewModel>();

export async function fetchForecast(location: ForecastLocation): Promise<ForecastViewModel> {
  const cached = cache.get(location);

  if (cached) {
    return cached;
  }

  const response = await fetch(buildForecastUrl(location).toString());

  if (!response.ok) {
    throw new Error("Forecast request failed");
  }

  const payload = (await response.json()) as OpenMeteoForecastResponse;
  const forecast = normalizeForecastResponse(payload);
  cache.set(location, forecast);
  return forecast;
}
