import { describe, expect, it } from "vitest";

import { arcOffset, elapsedFraction, formatRemaining, remainingMs } from "./ring";

const base = new Date(2026, 5, 29, 12, 0, 0, 0); // Mon 12:00

describe("elapsedFraction", () => {
  it("is 0 at the start of the interval", () => {
    const next = new Date(base.getTime() + 60 * 60_000);
    expect(elapsedFraction(base, next, 60)).toBe(0);
  });

  it("is 0.5 halfway through the interval", () => {
    const next = new Date(base.getTime() + 30 * 60_000);
    expect(elapsedFraction(base, next, 60)).toBeCloseTo(0.5, 10);
  });

  it("clamps to 1 once due", () => {
    const next = new Date(base.getTime() - 5 * 60_000);
    expect(elapsedFraction(base, next, 60)).toBe(1);
  });

  it("clamps to 0 when remaining exceeds the interval (window gap)", () => {
    const next = new Date(base.getTime() + 5 * 60 * 60_000); // 5h out, interval 60m
    expect(elapsedFraction(base, next, 60)).toBe(0);
  });
});

describe("arcOffset", () => {
  const c = 100;
  it("is the full circumference at fraction 0", () => {
    expect(arcOffset(0, c)).toBe(100);
  });
  it("is 0 at fraction 1", () => {
    expect(arcOffset(1, c)).toBe(0);
  });
  it("is half at fraction 0.5", () => {
    expect(arcOffset(0.5, c)).toBe(50);
  });
});

describe("remainingMs", () => {
  it("is positive for a future target", () => {
    expect(remainingMs(base, new Date(base.getTime() + 1000))).toBe(1000);
  });
  it("is 0 for a past target", () => {
    expect(remainingMs(base, new Date(base.getTime() - 1000))).toBe(0);
  });
});

describe("formatRemaining", () => {
  it("formats zero as 0:00", () => {
    expect(formatRemaining(0)).toBe("0:00");
  });
  it("formats under an hour as M:SS", () => {
    expect(formatRemaining(65_000)).toBe("1:05");
  });
  it("formats an hour or more as H:MM:SS", () => {
    expect(formatRemaining(3_725_000)).toBe("1:02:05");
  });
});
