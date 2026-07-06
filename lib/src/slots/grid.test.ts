// Test-first (red): lib/src/slots/grid.ts does not exist yet.
//
// Contract this test file pins down for the implementer (design.md Decision
// 3/4, spec.md Conventions):
//   - `generateGrid(from, days)` is a PURE, synchronous function.
//   - `from` is a Europe/Kyiv wall-clock LOCAL calendar date "YYYY-MM-DD"
//     (the first day of the horizon).
//   - `days` is the horizon length in calendar days (production call sites
//     always pass 14 per the baseline spec's Conventions section; it is an
//     explicit argument here — never `Date.now()` — for the same purity/
//     determinism discipline the spec applies to `rankSlots()`).
//   - It returns `Slot[]` where every `Slot` is `{ start, end }`, both
//     Europe/Kyiv wall-clock LOCAL strings in the fixed-width, zero-padded
//     form "YYYY-MM-DDTHH:mm" (no UTC offset, no "Z" — lib/ never touches a
//     timezone library per Decision 3; that fixed width also makes plain
//     lexicographic string comparison agree with chronological order).
//   - `end` is always exactly `start` + 60 minutes, same calendar date.
import { describe, expect, it } from "vitest";
import { generateGrid, isSlotOnGrid } from "./grid.ts";

const HOUR_STARTS = [
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
];

function weekdayIndex(dateStr: string): number {
  // Calendar-date arithmetic only (no wall-clock time, no timezone
  // conversion) — a calendar date's weekday does not depend on a timezone.
  // 0 = Sunday ... 6 = Saturday.
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

function minutesOf(hhmm: string): number {
  // Inputs are fixed-width zero-padded "HH:mm" (the grid contract this very
  // file asserts via HOUR_STARTS), so fixed-position slicing needs no
  // undefined guard under noUncheckedIndexedAccess.
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}

describe("generateGrid", () => {
  // @trace FR-SLOT-01
  // @trace FR-GUARD-03
  it("generates only Mon-Fri, 60-minute slots with 10:00-19:00-inclusive starts, across the 14-day proposal horizon (BC-SCHEDULE-01)", () => {
    const slots = generateGrid("2026-07-06", 14); // Monday

    expect(slots.length).toBeGreaterThan(0);

    for (const slot of slots) {
      const date = slot.start.slice(0, 10);
      const startTime = slot.start.slice(11, 16);
      const endDate = slot.end.slice(0, 10);
      const endTime = slot.end.slice(11, 16);

      // Every slot is exactly 60 minutes long and never crosses midnight.
      expect(endDate).toBe(date);
      expect(minutesOf(endTime) - minutesOf(startTime)).toBe(60);

      // Starts only on the hour, 10:00 through 19:00 inclusive.
      expect(HOUR_STARTS).toContain(startTime);

      // Mon-Fri only.
      const dow = weekdayIndex(date);
      expect(dow).toBeGreaterThanOrEqual(1);
      expect(dow).toBeLessThanOrEqual(5);
    }

    // No Saturday/Sunday date is ever present, even though the 14-day
    // window spans two weekends (2026-07-06 .. 2026-07-19).
    const dates = new Set(slots.map((s) => s.start.slice(0, 10)));
    for (const d of dates) {
      expect(weekdayIndex(d)).not.toBe(0);
      expect(weekdayIndex(d)).not.toBe(6);
    }

    // 14 calendar days starting on a Monday = exactly two Mon-Fri weeks =
    // 10 weekdays x 10 starts/day = 100 slots.
    expect(dates.size).toBe(10);
    expect(slots.length).toBe(100);
  });

  // @trace FR-GUARD-03
  it("never yields a slot outside the deterministic grid, even when subtracting an out-of-grid busy fixture (Sunday / after-hours) — subtraction only ever removes, never adds", async () => {
    // Deliberately colocated with the grid test (not subtract.test.ts) per
    // tasks.md 2.2 — this proves the GRID's own guarantee, not subtract's
    // interval semantics (that's 2.3-2.5).
    const { subtractBusy } = await import("./subtract");

    const grid = generateGrid("2026-07-06", 14);
    const outOfGridBusy = [
      // Sunday 2026-07-12 — not in the grid at all.
      { start: "2026-07-12T10:00", end: "2026-07-12T11:00" },
      // Monday 2026-07-06 but after the grid's last start (19:00-20:00) —
      // 21:00 is outside 10:00-19:00 starts entirely.
      { start: "2026-07-06T21:00", end: "2026-07-06T22:00" },
    ];

    const free = subtractBusy(grid, outOfGridBusy);

    // Subtraction can only shrink the set, never grow it.
    expect(free.length).toBeLessThanOrEqual(grid.length);
    // Every surviving slot is still a member of the original grid.
    for (const slot of free) {
      expect(grid).toContainEqual(slot);
    }
    // The out-of-grid fixture data introduced no Sunday slot into the result.
    expect(free.some((s) => s.start.startsWith("2026-07-12"))).toBe(false);
  });
});

// Test-first (red): `isSlotOnGrid` does not exist as behavior yet — a typed
// throwing stub only (booking-hitl tasks.md A.1/A.2, design.md Decision 3
// "one shared predicate, never re-derived"). Every case below is expected to
// FAIL against the stub until A.2 implements the real body.
describe("isSlotOnGrid", () => {
  // @trace BC-SCHEDULE-01
  // @trace FR-HITL-03
  it("returns true for every slot generateGrid itself produces", () => {
    const grid = generateGrid("2026-07-06", 14); // Monday
    expect(grid.length).toBeGreaterThan(0);
    for (const slot of grid) {
      expect(isSlotOnGrid(slot)).toBe(true);
    }
  });

  // @trace BC-SCHEDULE-01
  it("returns false for a Saturday slot", () => {
    // 2026-07-11 is a Saturday (2026-07-06 is the reference Monday above).
    expect(isSlotOnGrid({ start: "2026-07-11T15:00", end: "2026-07-11T16:00" })).toBe(false);
  });

  // @trace BC-SCHEDULE-01
  it("returns false for a Sunday slot", () => {
    expect(isSlotOnGrid({ start: "2026-07-12T15:00", end: "2026-07-12T16:00" })).toBe(false);
  });

  // @trace BC-SCHEDULE-01
  // @trace FR-HITL-03
  it("returns false for a 21:00 start (outside the 10:00-19:00 inclusive starts)", () => {
    expect(isSlotOnGrid({ start: "2026-07-06T21:00", end: "2026-07-06T22:00" })).toBe(false);
  });

  // @trace BC-SCHEDULE-01
  it("returns false for a non-hour-aligned start", () => {
    expect(isSlotOnGrid({ start: "2026-07-06T15:30", end: "2026-07-06T16:30" })).toBe(false);
  });

  // @trace BC-SCHEDULE-01
  it("returns false for a slot whose end is not exactly 60 minutes after start", () => {
    expect(isSlotOnGrid({ start: "2026-07-06T15:00", end: "2026-07-06T16:30" })).toBe(false);
  });
});
