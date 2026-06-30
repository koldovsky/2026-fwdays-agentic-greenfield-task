import { describe, expect, it } from "vitest";
import { weeklyMovePct } from "./weeklyMove";

function points(rates: number[]): { rate: number }[] {
  return rates.map((rate) => ({ rate }));
}

/** @trace FR-TREND-01 */
describe("weeklyMovePct", () => {
  it("computes the signed percentage move between the last point and 7 days earlier", () => {
    // 8 points: index 0 is "7 days ago", index 7 is "today".
    const data = points([100, 100, 100, 100, 100, 100, 100, 101.2]);
    const result = weeklyMovePct(data);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(1.2, 5);
  });

  it("computes a negative move when the rate weakened", () => {
    const data = points([100, 100, 100, 100, 100, 100, 100, 98.5]);
    expect(weeklyMovePct(data)!).toBeCloseTo(-1.5, 5);
  });

  it("uses only the last 8 points when more are provided", () => {
    const data = points([
      999, 999, 999, 999, 999, 999, 999, 999, 999, 999, 999, 999, 999, 999,
      999, 999, 999, 999, 999, 999, 999, 999,
      100, 100, 100, 100, 100, 100, 100, 101.2,
    ]);
    expect(weeklyMovePct(data)!).toBeCloseTo(1.2, 5);
  });

  it("returns null when there are fewer than 8 points", () => {
    expect(weeklyMovePct(points([100, 101, 102]))).toBeNull();
    expect(weeklyMovePct([])).toBeNull();
  });

  it("returns null when the 7-day-ago rate is zero (avoids division by zero)", () => {
    const data = points([0, 100, 100, 100, 100, 100, 100, 101]);
    expect(weeklyMovePct(data)).toBeNull();
  });

  it("never throws on malformed rate values", () => {
    const data = [
      { rate: Number.NaN },
      { rate: 100 },
      { rate: 100 },
      { rate: 100 },
      { rate: 100 },
      { rate: 100 },
      { rate: 100 },
      { rate: 100 },
    ];
    expect(() => weeklyMovePct(data)).not.toThrow();
    expect(weeklyMovePct(data)).toBeNull();
  });
});
