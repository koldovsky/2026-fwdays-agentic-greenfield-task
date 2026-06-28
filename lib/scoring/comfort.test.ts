import { describe, it, expect } from "vitest";
import { comfortScore } from "./comfort";
import type { ForecastDay } from "@/lib/forecast/types";
import { uk } from "@/lib/i18n/uk";

function day(overrides: Partial<ForecastDay> = {}): ForecastDay {
  return {
    date: "2026-07-05",
    weekdayUk: "Неділя",
    highC: 22,
    lowC: 15,
    feelsLikeMaxC: 22,
    feelsLikeMinC: 14,
    precipProbability: 10,
    windSpeedKmh: 12,
    cloudCoverPercent: 20,
    uvIndexMax: 3,
    weatherCode: 1,
    ...overrides,
  };
}

describe("comfortScore", () => {
  it("returns value ≥ 70 and comfort.good rationale for comfortable inputs", () => {
    const result = comfortScore(day());
    expect(result.value).toBeGreaterThanOrEqual(70);
    expect(result.rationale).toBe(uk.comfort.good);
  });

  it("returns value < 40 and comfort.cold rationale for very cold input", () => {
    const result = comfortScore(day({ feelsLikeMaxC: -5 }));
    expect(result.value).toBeLessThan(40);
    expect(result.rationale).toBe(uk.comfort.cold);
  });

  it("returns value < 40 and comfort.hot rationale for very hot input", () => {
    const result = comfortScore(day({ feelsLikeMaxC: 38 }));
    expect(result.value).toBeLessThan(40);
    expect(result.rationale).toBe(uk.comfort.hot);
  });

  it("returns comfort.rainy when precip ≥ 70% with comfortable temperature", () => {
    const result = comfortScore(day({ precipProbability: 80 }));
    expect(result.rationale).toBe(uk.comfort.rainy);
  });

  it("returns comfort.windy when wind ≥ 50 km/h with comfortable temperature", () => {
    const result = comfortScore(day({ windSpeedKmh: 60, precipProbability: 5 }));
    expect(result.rationale).toBe(uk.comfort.windy);
  });

  it("value is always an integer in [0, 100]", () => {
    const cases: Partial<ForecastDay>[] = [
      { feelsLikeMaxC: -30 },
      { feelsLikeMaxC: 50 },
      { precipProbability: 0 },
      { precipProbability: 100 },
      { windSpeedKmh: 0 },
      { windSpeedKmh: 120 },
      { uvIndexMax: 0 },
      { uvIndexMax: 15 },
      { cloudCoverPercent: 0 },
      { cloudCoverPercent: 100 },
    ];
    for (const override of cases) {
      const { value } = comfortScore(day(override));
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it("all comfort.* i18n strings are ≤ 80 chars and contain no emoji", () => {
    const emojiRegex = /\p{Emoji_Presentation}/u;
    const comfortKeys = ["good", "cold", "hot", "rainy", "windy"] as const;
    for (const key of comfortKeys) {
      const str = uk.comfort[key];
      expect(str.length, `comfort.${key} exceeds 80 chars`).toBeLessThanOrEqual(80);
      expect(emojiRegex.test(str), `comfort.${key} contains emoji`).toBe(false);
    }
  });
});
