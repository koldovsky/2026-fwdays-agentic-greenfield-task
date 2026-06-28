import { describe, expect, it } from "vitest";
import { getWeekendDays } from "./weekendDays";
import type { ForecastDay } from "./types";

function makeDay(date: string): ForecastDay {
  return {
    date,
    weekdayUk: "",
    highC: 0,
    lowC: 0,
    precipProbability: 0,
    windSpeedKmh: 0,
    weatherCode: 0,
    feelsLikeMaxC: 0,
    feelsLikeMinC: 0,
    cloudCoverPercent: 0,
    uvIndexMax: 0,
  };
}

describe("getWeekendDays", () => {
  it("finds Saturday and Sunday", () => {
    // 2024-06-29 Saturday, 2024-06-30 Sunday
    const days = [
      makeDay("2024-06-27"),
      makeDay("2024-06-28"),
      makeDay("2024-06-29"),
      makeDay("2024-06-30"),
    ];
    const { saturday, sunday } = getWeekendDays(days);
    expect(saturday?.date).toBe("2024-06-29");
    expect(sunday?.date).toBe("2024-06-30");
  });

  it("returns null for missing Saturday", () => {
    const { saturday, sunday } = getWeekendDays([makeDay("2024-06-30")]);
    expect(saturday).toBeNull();
    expect(sunday?.date).toBe("2024-06-30");
  });

  it("returns null for missing Sunday", () => {
    const { saturday, sunday } = getWeekendDays([makeDay("2024-06-29")]);
    expect(saturday?.date).toBe("2024-06-29");
    expect(sunday).toBeNull();
  });

  it("returns null for both when no weekend days in window", () => {
    const days = [makeDay("2024-06-24"), makeDay("2024-06-25"), makeDay("2024-06-26")];
    const { saturday, sunday } = getWeekendDays(days);
    expect(saturday).toBeNull();
    expect(sunday).toBeNull();
  });

  it("handles empty array", () => {
    const { saturday, sunday } = getWeekendDays([]);
    expect(saturday).toBeNull();
    expect(sunday).toBeNull();
  });
});
