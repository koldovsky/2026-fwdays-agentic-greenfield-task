import { describe, expect, it } from "vitest";
import {
  comfortBadgeTier,
  comfortScore,
  ComfortValidationError,
  weekendComfortHighlight,
  type DailyComfortInput,
} from "./comfort";

const warmDry: DailyComfortInput = {
  feelsLikeC: 24,
  precipProbability: 5,
  windSpeedKmh: 8,
  cloudCoverPercent: 15,
  uvIndex: 4,
};

const rainyCold: DailyComfortInput = {
  feelsLikeC: 10,
  precipProbability: 70,
  windSpeedKmh: 12,
  cloudCoverPercent: 90,
  uvIndex: 2,
};

const highUvMild: DailyComfortInput = {
  feelsLikeC: 22,
  precipProbability: 10,
  windSpeedKmh: 10,
  cloudCoverPercent: 20,
  uvIndex: 9,
};

const EMOJI_PATTERN =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/u;

describe("comfortScore", () => {
  // @trace FR-COMFORT-01
  it("returns value and rationale for a warm dry day", () => {
    const result = comfortScore(warmDry);
    expect(result.value).toBeGreaterThanOrEqual(70);
    expect(result.value).toBeLessThanOrEqual(100);
    expect(typeof result.rationale).toBe("string");
  });

  // @trace FR-COMFORT-01
  it("is pure — repeated calls return identical results", () => {
    expect(comfortScore(warmDry)).toEqual(comfortScore(warmDry));
  });

  // @trace FR-COMFORT-01
  it("rejects invalid input", () => {
    expect(() =>
      comfortScore({ ...warmDry, precipProbability: Number.NaN }),
    ).toThrow(ComfortValidationError);
    expect(() =>
      comfortScore({ ...warmDry, cloudCoverPercent: 120 }),
    ).toThrow(ComfortValidationError);
  });

  // @trace FR-COMFORT-02
  it("lowers score when precipitation rises", () => {
    const dry = comfortScore(warmDry);
    const wet = comfortScore({ ...warmDry, precipProbability: 80 });
    expect(wet.value).toBeLessThan(dry.value);
    expect(wet.rationale.toLowerCase()).toMatch(/дощ|парасол/);
  });

  // @trace FR-COMFORT-02
  it("lowers score when wind rises", () => {
    const calm = comfortScore({ ...warmDry, windSpeedKmh: 10 });
    const windy = comfortScore({ ...warmDry, windSpeedKmh: 55 });
    expect(windy.value).toBeLessThan(calm.value);
  });

  // @trace FR-COMFORT-03
  it("keeps rationale Ukrainian, short, and emoji-free", () => {
    const samples = [warmDry, rainyCold, highUvMild].map(comfortScore);
    for (const { rationale } of samples) {
      expect(rationale.length).toBeLessThanOrEqual(80);
      expect(EMOJI_PATTERN.test(rationale)).toBe(false);
      expect(rationale).toMatch(/[а-яіїєґ]/i);
    }
  });

  // @trace FR-COMFORT-03
  it("does not sound pleasant on rainy cold days", () => {
    const result = comfortScore(rainyCold);
    expect(result.value).toBeLessThan(40);
    expect(result.rationale.toLowerCase()).not.toContain("приємно");
    expect(result.rationale.toLowerCase()).toMatch(/дощ|прохолод/);
  });

  // @trace FR-COMFORT-03
  it("mentions sun exposure on high UV days", () => {
    const result = comfortScore(highUvMild);
    expect(result.rationale.toLowerCase()).toMatch(/сонц|uv/);
    expect(result.rationale.toLowerCase()).not.toMatch(/ідеальн|прохолод/);
  });
});

describe("comfortBadgeTier", () => {
  // @trace FR-COMFORT-04
  it("maps green, yellow, and red tiers", () => {
    expect(comfortBadgeTier(87)).toBe("green");
    expect(comfortBadgeTier(55)).toBe("yellow");
    expect(comfortBadgeTier(28)).toBe("red");
  });

  // @trace FR-COMFORT-04
  it("maps boundary values correctly", () => {
    expect(comfortBadgeTier(70)).toBe("green");
    expect(comfortBadgeTier(69)).toBe("yellow");
    expect(comfortBadgeTier(40)).toBe("yellow");
    expect(comfortBadgeTier(39)).toBe("red");
  });
});

describe("weekendComfortHighlight", () => {
  // @trace FR-COMFORT-05
  it("averages Saturday and Sunday scores", () => {
    const days = [
      { date: "2026-06-22", input: warmDry },
      { date: "2026-06-23", input: warmDry },
      { date: "2026-06-24", input: warmDry },
      { date: "2026-06-25", input: warmDry },
      { date: "2026-06-26", input: warmDry },
      {
        date: "2026-06-27",
        input: { ...warmDry, precipProbability: 0, cloudCoverPercent: 5 },
      },
      {
        date: "2026-06-28",
        input: { ...warmDry, precipProbability: 40, cloudCoverPercent: 60 },
      },
    ];

    const highlight = weekendComfortHighlight(days);
    expect(highlight).not.toBeNull();
    expect(highlight!.saturday.value).toBe(comfortScore(days[5]!.input).value);
    expect(highlight!.sunday.value).toBe(comfortScore(days[6]!.input).value);
    expect(highlight!.value).toBe(
      Math.round((highlight!.saturday.value + highlight!.sunday.value) / 2),
    );
  });

  // @trace FR-COMFORT-05
  it("returns null when the weekend is missing", () => {
    const weekdaysOnly = [
      { date: "2026-06-22", input: warmDry },
      { date: "2026-06-23", input: warmDry },
      { date: "2026-06-24", input: warmDry },
      { date: "2026-06-25", input: warmDry },
      { date: "2026-06-26", input: warmDry },
    ];
    expect(weekendComfortHighlight(weekdaysOnly)).toBeNull();
  });
});
