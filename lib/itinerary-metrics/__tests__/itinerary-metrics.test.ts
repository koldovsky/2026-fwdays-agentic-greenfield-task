import { describe, expect, it } from "vitest";

import {
  ASSUMED_AVERAGE_SPEED_KMH,
  estimateDurationMinutes,
  formatDurationUk,
} from "@/lib/itinerary-metrics";

describe("itinerary metrics (FR-VIEW-02)", () => {
  it("estimates duration from distance at assumed average speed", () => {
    expect(estimateDurationMinutes(120)).toBe(120);
    expect(estimateDurationMinutes(60, ASSUMED_AVERAGE_SPEED_KMH)).toBe(60);
  });

  it("formats duration in Ukrainian", () => {
    expect(formatDurationUk(45)).toBe("45 хв");
    expect(formatDurationUk(60)).toBe("1 год");
    expect(formatDurationUk(90)).toBe("1 год 30 хв");
  });

  it("produces identical formatting for the same input", () => {
    const first = formatDurationUk(estimateDurationMinutes(240));
    const second = formatDurationUk(estimateDurationMinutes(240));
    expect(first).toBe(second);
    expect(first).toBe("4 год");
  });
});
