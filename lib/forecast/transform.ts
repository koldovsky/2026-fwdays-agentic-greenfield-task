// Transform raw Open-Meteo forecast API response into ForecastResponse.
// Framework-free (TC-PURE-01): no next/*, no react, no DOM globals.

import type { ForecastDay, ForecastResponse, HourlyPoint } from "./types";

const UK_WEEKDAYS = ["неділя", "понеділок", "вівторок", "середа", "четвер", "пʼятниця", "субота"];

// Raw shape returned by Open-Meteo /v1/forecast
interface RawForecast {
  timezone?: string;
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    apparent_temperature_max?: number[];
    apparent_temperature_min?: number[];
    precipitation_probability_max?: number[];
    wind_speed_10m_max?: number[];
    cloud_cover_mean?: number[];
    uv_index_max?: number[];
    weather_code?: number[];
    sunrise?: string[];
    sunset?: string[];
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
  };
}

export function transformForecast(raw: RawForecast): ForecastResponse {
  const d = raw.daily ?? {};
  const h = raw.hourly ?? {};
  const times = d.time ?? [];

  const days: ForecastDay[] = times.map((dateStr, i) => {
    const date = new Date(dateStr + "T12:00:00Z");
    return {
      date: dateStr,
      weekdayUk: UK_WEEKDAYS[date.getUTCDay()],
      highC: roundOne(d.temperature_2m_max?.[i] ?? 0),
      lowC: roundOne(d.temperature_2m_min?.[i] ?? 0),
      precipProbability: Math.round(d.precipitation_probability_max?.[i] ?? 0),
      windSpeedKmh: roundOne(d.wind_speed_10m_max?.[i] ?? 0),
      weatherCode: d.weather_code?.[i] ?? 0,
      feelsLikeMaxC: roundOne(d.apparent_temperature_max?.[i] ?? 0),
      feelsLikeMinC: roundOne(d.apparent_temperature_min?.[i] ?? 0),
      cloudCoverPercent: Math.round(d.cloud_cover_mean?.[i] ?? 0),
      uvIndexMax: roundOne(d.uv_index_max?.[i] ?? 0),
    };
  });

  const hourlyTimes = h.time ?? [];
  const hourlyTemps = h.temperature_2m ?? [];
  const hours: HourlyPoint[] = hourlyTimes
    .slice(0, 48)
    .map((time, i) => ({ time, tempC: roundOne(hourlyTemps[i] ?? 0) }));

  const sunriseIso = d.sunrise?.[0] ?? "";
  const sunsetIso = d.sunset?.[0] ?? "";

  return {
    days,
    hours,
    sunriseIso,
    sunsetIso,
    timezone: raw.timezone ?? "UTC",
  };
}

function roundOne(n: number): number {
  return Math.round(n * 10) / 10;
}
