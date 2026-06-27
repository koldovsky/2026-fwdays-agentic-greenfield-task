import { describe, expect, it } from "vitest";

import type { BreakEvent } from "../types";
import { aggregateStats, weekRange } from "./stats";

// Reference week: 2026-06-29 is Monday, 2026-06-30 Tuesday, 2026-07-06 next Monday.
const ts = (month: number, day: number, hour: number): number =>
  new Date(2026, month, day, hour, 0, 0, 0).getTime();

const weekMonToSun = {
  start: new Date(2026, 5, 29, 0, 0, 0, 0), // Mon 2026-06-29
  end: new Date(2026, 6, 6, 0, 0, 0, 0), // next Mon 2026-07-06 (exclusive)
};

describe("aggregateStats", () => {
  it("AC-STATS-01: totals + per-day breakdown over a range", () => {
    const events: BreakEvent[] = [
      { type: "done", timestamp: ts(5, 29, 10) }, // Mon
      { type: "done", timestamp: ts(5, 29, 14) }, // Mon
      { type: "snoozed", timestamp: ts(5, 30, 9) }, // Tue
    ];

    expect(aggregateStats(events, weekMonToSun)).toEqual({
      done: 2,
      snoozed: 1,
      byDay: [
        { day: "2026-06-29", done: 2, snoozed: 0 },
        { day: "2026-06-30", done: 0, snoozed: 1 },
      ],
    });
  });

  it("AC-STATS-02: empty input yields zero totals and no days", () => {
    expect(aggregateStats([], weekMonToSun)).toEqual({
      done: 0,
      snoozed: 0,
      byDay: [],
    });
  });

  it("ignores events outside the range", () => {
    const events: BreakEvent[] = [
      { type: "done", timestamp: ts(5, 28, 10) }, // Sun before the week
      { type: "done", timestamp: ts(6, 6, 1) }, // next Mon (>= end, excluded)
      { type: "snoozed", timestamp: ts(5, 30, 9) }, // Tue, in range
    ];
    const summary = aggregateStats(events, weekMonToSun);
    expect(summary.done).toBe(0);
    expect(summary.snoozed).toBe(1);
    expect(summary.byDay).toEqual([{ day: "2026-06-30", done: 0, snoozed: 1 }]);
  });
});

describe("weekRange", () => {
  it("anchors to Monday and spans seven days", () => {
    const { start, end } = weekRange(new Date(2026, 6, 1, 15, 30)); // Wed 2026-07-01
    expect(start.getTime()).toBe(new Date(2026, 5, 29, 0, 0, 0, 0).getTime()); // Mon 06-29
    expect(end.getTime()).toBe(new Date(2026, 6, 6, 0, 0, 0, 0).getTime()); // Mon 07-06
  });

  it("keeps Monday itself as the week start", () => {
    const { start } = weekRange(new Date(2026, 5, 29, 23, 59)); // Mon
    expect(start.getTime()).toBe(new Date(2026, 5, 29, 0, 0, 0, 0).getTime());
  });
});
