import type { CityLocation } from "@/lib/city-search/geocoding";
import type { ForecastViewModel } from "@/lib/forecast/forecast";
import { isLocationDaytime } from "./daytime";
import {
  defaultBackgroundVisual,
  resolveBackgroundVisual,
  type BackgroundVisual,
} from "./background-visual";
import { weatherCodeToBackgroundCondition } from "./weather-condition";

export function backgroundVisualFromForecast(
  forecast: ForecastViewModel | null,
  location: CityLocation | null,
  now: Date,
  reducedMotion: boolean,
): BackgroundVisual {
  if (!forecast?.days[0]) {
    return defaultBackgroundVisual(reducedMotion);
  }

  const today = forecast.days[0];

  return resolveBackgroundVisual({
    condition: weatherCodeToBackgroundCondition(today.weatherCode),
    isDaytime: isLocationDaytime(
      now,
      today.sunrise,
      today.sunset,
      location?.timezone ?? null,
    ),
    reducedMotion,
  });
}
