import {
  comfortBadgeTier,
  comfortScore,
  weekendComfortHighlight,
  type ComfortBadgeTier,
  type ComfortResult,
  type WeekendHighlight,
} from "@/lib/scoring/comfort";

const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const MS_TO_KMH = 3.6;

const DAILY_FIELDS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "apparent_temperature_max",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "uv_index_max",
  "sunrise",
  "sunset",
] as const;

export type ForecastLocation = {
  latitude: number;
  longitude: number;
};

export type OpenMeteoForecastResponse = {
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    apparent_temperature_max?: number[];
    precipitation_probability_max?: number[];
    wind_speed_10m_max?: number[];
    uv_index_max?: number[];
    sunrise?: string[];
    sunset?: string[];
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
  };
};

export type ForecastDay = {
  date: string;
  weekday: string;
  weatherCode: number;
  weatherIcon: string;
  temperatureMaxC: number;
  temperatureMinC: number;
  precipitationProbability: number;
  windSpeedMs: number;
  sunrise: string | null;
  sunset: string | null;
  comfort: ComfortResult;
  comfortTier: ComfortBadgeTier;
};

export type HourlyTemperaturePoint = {
  time: string;
  label: string;
  temperatureC: number;
};

export type ForecastViewModel = {
  days: ForecastDay[];
  hourly: HourlyTemperaturePoint[];
  todaySun: {
    sunrise: string | null;
    sunset: string | null;
  } | null;
  weekendHighlight: WeekendHighlight | null;
};

export function buildForecastUrl(location: ForecastLocation): URL {
  const url = new URL(FORECAST_ENDPOINT);
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("daily", DAILY_FIELDS.join(","));
  url.searchParams.set("hourly", "temperature_2m");
  url.searchParams.set("forecast_hours", "48");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("wind_speed_unit", "ms");
  return url;
}

export function normalizeForecastResponse(
  response: OpenMeteoForecastResponse,
): ForecastViewModel {
  const days = normalizeDailyForecast(response.daily);
  const hourly = normalizeHourlyForecast(response.hourly);

  return {
    days,
    hourly,
    todaySun: days[0]
      ? {
          sunrise: formatTime(days[0].sunrise),
          sunset: formatTime(days[0].sunset),
        }
      : null,
    weekendHighlight: weekendComfortHighlight(
      days.map((day) => ({
        date: day.date,
        input: {
          feelsLikeC: day.comfortInput.feelsLikeC,
          precipProbability: day.comfortInput.precipProbability,
          windSpeedKmh: day.comfortInput.windSpeedKmh,
          cloudCoverPercent: day.comfortInput.cloudCoverPercent,
          uvIndex: day.comfortInput.uvIndex,
        },
      })),
    ),
  };
}

export class ForecastMemoryCache<T> {
  private entry: { key: string; value: T } | null = null;

  get(location: ForecastLocation): T | null {
    const key = forecastCacheKey(location);
    return this.entry?.key === key ? this.entry.value : null;
  }

  set(location: ForecastLocation, value: T): void {
    this.entry = {
      key: forecastCacheKey(location),
      value,
    };
  }
}

function normalizeDailyForecast(
  daily: OpenMeteoForecastResponse["daily"],
): Array<ForecastDay & { comfortInput: Parameters<typeof comfortScore>[0] }> {
  const dates = daily?.time ?? [];

  return dates.slice(0, 7).flatMap((date, index) => {
    const temperatureMaxC = numberAt(daily?.temperature_2m_max, index);
    const temperatureMinC = numberAt(daily?.temperature_2m_min, index);
    const feelsLikeC = numberAt(daily?.apparent_temperature_max, index);
    const precipitationProbability = numberAt(daily?.precipitation_probability_max, index);
    const windSpeedMs = numberAt(daily?.wind_speed_10m_max, index);
    const uvIndex = numberAt(daily?.uv_index_max, index);
    const weatherCode = numberAt(daily?.weather_code, index);

    if (
      temperatureMaxC === null ||
      temperatureMinC === null ||
      feelsLikeC === null ||
      precipitationProbability === null ||
      windSpeedMs === null ||
      uvIndex === null ||
      weatherCode === null
    ) {
      return [];
    }

    const comfortInput = {
      feelsLikeC,
      precipProbability: precipitationProbability,
      windSpeedKmh: windSpeedMs * MS_TO_KMH,
      cloudCoverPercent: weatherCodeToCloudCover(weatherCode),
      uvIndex,
    };
    const comfort = comfortScore(comfortInput);

    return [
      {
        date,
        weekday: formatWeekday(date),
        weatherCode,
        weatherIcon: weatherCodeToIcon(weatherCode),
        temperatureMaxC,
        temperatureMinC,
        precipitationProbability,
        windSpeedMs,
        sunrise: daily?.sunrise?.[index] ?? null,
        sunset: daily?.sunset?.[index] ?? null,
        comfort,
        comfortTier: comfortBadgeTier(comfort.value),
        comfortInput,
      },
    ];
  });
}

function normalizeHourlyForecast(
  hourly: OpenMeteoForecastResponse["hourly"],
): HourlyTemperaturePoint[] {
  const times = hourly?.time ?? [];
  const temperatures = hourly?.temperature_2m ?? [];

  return times.slice(0, 48).flatMap((time, index) => {
    const temperatureC = numberAt(temperatures, index);

    if (temperatureC === null) {
      return [];
    }

    return [
      {
        time,
        label: formatTime(time) ?? time,
        temperatureC,
      },
    ];
  });
}

function numberAt(values: number[] | undefined, index: number): number | null {
  const value = values?.[index];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function weatherCodeToIcon(code: number): string {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if (code >= 51 && code <= 99) return "🌧️";
  return "☁️";
}

function weatherCodeToCloudCover(code: number): number {
  if (code === 0) return 10;
  if (code === 1) return 25;
  if (code === 2) return 55;
  if (code === 3) return 85;
  if ([45, 48].includes(code)) return 90;
  if (code >= 51) return 95;
  return 70;
}

function formatWeekday(date: string): string {
  return new Intl.DateTimeFormat("uk-UA", { weekday: "short" }).format(new Date(date));
}

function formatTime(value: string | null): string | null {
  if (!value) return null;
  return value.slice(11, 16) || null;
}

function forecastCacheKey(location: ForecastLocation): string {
  return `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
}
