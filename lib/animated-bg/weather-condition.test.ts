import { describe, expect, it } from "vitest";
import { weatherCodeToBackgroundCondition } from "./weather-condition";

// @trace FR-ANIM-01
describe("weatherCodeToBackgroundCondition", () => {
  it("maps clear and partly cloudy codes to clear", () => {
    expect(weatherCodeToBackgroundCondition(0)).toBe("clear");
    expect(weatherCodeToBackgroundCondition(1)).toBe("clear");
    expect(weatherCodeToBackgroundCondition(2)).toBe("clear");
  });

  it("maps overcast and fog codes to overcast", () => {
    expect(weatherCodeToBackgroundCondition(3)).toBe("overcast");
    expect(weatherCodeToBackgroundCondition(45)).toBe("overcast");
  });

  it("maps rain codes to rain", () => {
    expect(weatherCodeToBackgroundCondition(61)).toBe("rain");
    expect(weatherCodeToBackgroundCondition(95)).toBe("rain");
  });

  it("maps snow codes to snow", () => {
    expect(weatherCodeToBackgroundCondition(71)).toBe("snow");
    expect(weatherCodeToBackgroundCondition(86)).toBe("snow");
  });
});
