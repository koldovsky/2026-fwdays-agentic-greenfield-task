import { describe, it, expect } from "vitest";
import { getWeatherState } from "./conditions";

const SR = "2026-06-27T05:00:00Z"; // sunrise
const SS = "2026-06-27T20:00:00Z"; // sunset
const DAY = "2026-06-27T12:00:00Z"; // noon — between rise and set
const NIGHT = "2026-06-27T22:00:00Z"; // after sunset
const PRE_DAWN = "2026-06-27T03:00:00Z"; // before sunrise

describe("getWeatherState — clear", () => {
  it("code 0 + daytime → clear-day", () =>
    expect(getWeatherState(0, SR, SS, DAY)).toBe("clear-day"));
  it("code 0 + nighttime → clear-night", () =>
    expect(getWeatherState(0, SR, SS, NIGHT)).toBe("clear-night"));
  it("code 0 + pre-dawn → clear-night", () =>
    expect(getWeatherState(0, SR, SS, PRE_DAWN)).toBe("clear-night"));
  it("code 0 + exactly at sunrise → clear-day", () =>
    expect(getWeatherState(0, SR, SS, SR)).toBe("clear-day"));
  it("code 0 + exactly at sunset → clear-night", () =>
    expect(getWeatherState(0, SR, SS, SS)).toBe("clear-night"));
});

describe("getWeatherState — cloudy", () => {
  it("code 1 + daytime → cloudy-day", () =>
    expect(getWeatherState(1, SR, SS, DAY)).toBe("cloudy-day"));
  it("code 2 + daytime → cloudy-day", () =>
    expect(getWeatherState(2, SR, SS, DAY)).toBe("cloudy-day"));
  it("code 3 + daytime → cloudy-day", () =>
    expect(getWeatherState(3, SR, SS, DAY)).toBe("cloudy-day"));
  it("code 45 (fog) + nighttime → cloudy-night", () =>
    expect(getWeatherState(45, SR, SS, NIGHT)).toBe("cloudy-night"));
  it("code 48 (icy fog) + daytime → cloudy-day", () =>
    expect(getWeatherState(48, SR, SS, DAY)).toBe("cloudy-day"));
});

describe("getWeatherState — rain", () => {
  it("code 51 (light drizzle) → rain", () => expect(getWeatherState(51, SR, SS, DAY)).toBe("rain"));
  it("code 61 (moderate rain) + daytime → rain", () =>
    expect(getWeatherState(61, SR, SS, DAY)).toBe("rain"));
  it("code 67 (heavy freezing rain) → rain", () =>
    expect(getWeatherState(67, SR, SS, DAY)).toBe("rain"));
  it("code 80 (light shower) → rain", () => expect(getWeatherState(80, SR, SS, DAY)).toBe("rain"));
  it("code 82 (heavy shower) → rain", () => expect(getWeatherState(82, SR, SS, DAY)).toBe("rain"));
  it("code 95 (thunderstorm) → rain", () => expect(getWeatherState(95, SR, SS, DAY)).toBe("rain"));
  it("code 99 (heavy hail storm) → rain", () =>
    expect(getWeatherState(99, SR, SS, DAY)).toBe("rain"));
  it("rain ignores day/night (nighttime still rain)", () =>
    expect(getWeatherState(61, SR, SS, NIGHT)).toBe("rain"));
});

describe("getWeatherState — snow", () => {
  it("code 71 (light snow) → snow", () => expect(getWeatherState(71, SR, SS, DAY)).toBe("snow"));
  it("code 73 (moderate snow) + nighttime → snow", () =>
    expect(getWeatherState(73, SR, SS, NIGHT)).toBe("snow"));
  it("code 75 (heavy snow) → snow", () => expect(getWeatherState(75, SR, SS, DAY)).toBe("snow"));
  it("code 77 (snow grains) → snow", () => expect(getWeatherState(77, SR, SS, DAY)).toBe("snow"));
  it("code 85 (light snow shower) → snow", () =>
    expect(getWeatherState(85, SR, SS, DAY)).toBe("snow"));
  it("code 86 (heavy snow shower) → snow", () =>
    expect(getWeatherState(86, SR, SS, DAY)).toBe("snow"));
});

describe("getWeatherState — unknown / fallback", () => {
  it("unknown code + daytime → clear-day", () =>
    expect(getWeatherState(999, SR, SS, DAY)).toBe("clear-day"));
  it("unknown code + nighttime → clear-night", () =>
    expect(getWeatherState(999, SR, SS, NIGHT)).toBe("clear-night"));
  it("negative code + daytime → clear-day", () =>
    expect(getWeatherState(-1, SR, SS, DAY)).toBe("clear-day"));
});

describe("getWeatherState — malformed dates", () => {
  it("malformed sunrise/sunset → defaults to daytime (clear-day for code 0)", () =>
    expect(getWeatherState(0, "invalid", "invalid", DAY)).toBe("clear-day"));
  it("malformed nowIso → defaults to daytime (clear-day for code 0)", () =>
    expect(getWeatherState(0, SR, SS, "invalid")).toBe("clear-day"));
  it("empty strings → defaults to daytime (clear-day for code 0)", () =>
    expect(getWeatherState(0, "", "", "")).toBe("clear-day"));
});
