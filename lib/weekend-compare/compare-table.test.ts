import { describe, expect, it } from "vitest";
import type { ForecastDay } from "@/lib/forecast/forecast";
import { buildWeekendCompareRows } from "./compare-table";

function day(
  date: string,
  weekday: string,
  overrides: Partial<ForecastDay> = {},
): ForecastDay {
  return {
    date,
    weekday,
    weatherCode: 0,
    weatherIcon: "☀️",
    temperatureMaxC: 20,
    temperatureMinC: 10,
    precipitationProbability: 10,
    windSpeedMs: 3,
    sunrise: null,
    sunset: null,
    comfort: { value: 70, rationale: "комфортно" },
    comfortTier: "green",
    ...overrides,
  };
}

describe("weekend compare table", () => {
  // @trace FR-COMPARE-02
  it("builds Saturday and Sunday rows with hi/lo, precip, and comfort", () => {
    const rows = buildWeekendCompareRows([
      day("2026-06-24", "Ser"),
      day("2026-06-27", "Sat", {
        temperatureMaxC: 24,
        temperatureMinC: 15,
        precipitationProbability: 20,
        comfort: { value: 68, rationale: "помірно" },
        comfortTier: "yellow",
      }),
      day("2026-06-28", "Sun", {
        temperatureMaxC: 26,
        temperatureMinC: 17,
        precipitationProbability: 5,
        comfort: { value: 82, rationale: "комфортно" },
        comfortTier: "green",
      }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      day: "saturday",
      temperatureMaxC: 24,
      temperatureMinC: 15,
      precipitationProbability: 20,
      comfortValue: 68,
    });
    expect(rows[1]).toMatchObject({
      day: "sunday",
      comfortValue: 82,
    });
  });

  // @trace FR-COMPARE-03
  it("returns an empty compare model when the weekend is missing", () => {
    expect(buildWeekendCompareRows([day("2026-06-24", "Ser")])).toEqual([]);
  });
});
