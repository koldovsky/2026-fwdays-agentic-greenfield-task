import { describe, expect, it } from "vitest";
import {
  ForecastMemoryCache,
  buildForecastUrl,
  normalizeForecastResponse,
} from "./forecast";

const forecastResponse = {
  daily: {
    time: [
      "2026-06-27",
      "2026-06-28",
      "2026-06-29",
      "2026-06-30",
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
    ],
    weather_code: [0, 61, 3, 45, 80, 1, 2],
    temperature_2m_max: [24, 20, 21, 22, 23, 24, 25],
    temperature_2m_min: [14, 13, 12, 11, 12, 13, 14],
    apparent_temperature_max: [25, 18, 20, 21, 22, 23, 24],
    precipitation_probability_max: [5, 70, 30, 20, 55, 10, 15],
    wind_speed_10m_max: [3, 5, 4, 4, 6, 3, 3],
    uv_index_max: [4, 2, 3, 3, 2, 5, 5],
    sunrise: [
      "2026-06-27T05:02",
      "2026-06-28T05:03",
      "2026-06-29T05:04",
      "2026-06-30T05:05",
      "2026-07-01T05:06",
      "2026-07-02T05:07",
      "2026-07-03T05:08",
    ],
    sunset: [
      "2026-06-27T21:11",
      "2026-06-28T21:10",
      "2026-06-29T21:09",
      "2026-06-30T21:08",
      "2026-07-01T21:07",
      "2026-07-02T21:06",
      "2026-07-03T21:05",
    ],
  },
  hourly: {
    time: Array.from({ length: 60 }, (_, index) => `2026-06-27T${String(index % 24).padStart(2, "0")}:00`),
    temperature_2m: Array.from({ length: 60 }, (_, index) => 15 + (index % 10)),
  },
};

describe("forecast helpers", () => {
  // @trace FR-FORECAST-01
  it("builds Open-Meteo forecast URLs with required daily and hourly fields", () => {
    const url = buildForecastUrl({ latitude: 50.45, longitude: 30.52 });
    const dailyFields = url.searchParams.get("daily")?.split(",");

    expect(url.origin).toBe("https://api.open-meteo.com");
    expect(url.pathname).toBe("/v1/forecast");
    expect(url.searchParams.get("latitude")).toBe("50.45");
    expect(url.searchParams.get("longitude")).toBe("30.52");
    expect(url.searchParams.get("forecast_days")).toBe("7");
    expect(url.searchParams.get("forecast_hours")).toBe("48");
    expect(url.searchParams.get("timezone")).toBe("auto");
    expect(url.searchParams.get("wind_speed_unit")).toBe("ms");
    expect(dailyFields).toEqual([
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "uv_index_max",
      "sunrise",
      "sunset",
    ]);
    expect(url.searchParams.get("hourly")).toBe("temperature_2m");
  });

  // @trace FR-FORECAST-02
  it("normalizes seven day cards with forecast display fields", () => {
    const forecast = normalizeForecastResponse(forecastResponse);

    expect(forecast.days).toHaveLength(7);
    expect(forecast.days[0]).toMatchObject({
      date: "2026-06-27",
      temperatureMaxC: 24,
      temperatureMinC: 14,
      precipitationProbability: 5,
      windSpeedMs: 3,
      weatherIcon: "☀️",
    });
  });

  // @trace FR-FORECAST-03
  it("uses the first 48 hourly temperature points for the chart", () => {
    const forecast = normalizeForecastResponse(forecastResponse);

    expect(forecast.hourly).toHaveLength(48);
    expect(forecast.hourly[0]).toEqual({
      time: "2026-06-27T00:00",
      label: "00:00",
      temperatureC: 15,
    });
  });

  // @trace FR-FORECAST-04
  it("formats today's sunrise and sunset note", () => {
    const forecast = normalizeForecastResponse(forecastResponse);

    expect(forecast.todaySun).toEqual({
      sunrise: "05:02",
      sunset: "21:11",
    });
  });

  // @trace FR-FORECAST-05
  it("caches successful forecast responses by location coordinates", () => {
    const cache = new ForecastMemoryCache<string>();
    cache.set({ latitude: 50.45, longitude: 30.52 }, "kyiv");

    expect(cache.get({ latitude: 50.45, longitude: 30.52 })).toBe("kyiv");
    expect(cache.get({ latitude: 49.84, longitude: 24.03 })).toBeNull();

    cache.set({ latitude: 49.84, longitude: 24.03 }, "lviv");

    expect(cache.get({ latitude: 49.84, longitude: 24.03 })).toBe("lviv");
    expect(cache.get({ latitude: 50.45, longitude: 30.52 })).toBeNull();
  });

  // @trace FR-COMFORT-04, FR-COMFORT-05
  it("attaches comfort badge data and a weekend highlight", () => {
    const forecast = normalizeForecastResponse(forecastResponse);

    expect(forecast.days[0].comfort.value).toBeGreaterThan(0);
    expect(["green", "yellow", "red"]).toContain(forecast.days[0].comfortTier);
    expect(forecast.weekendHighlight).not.toBeNull();
  });
});
