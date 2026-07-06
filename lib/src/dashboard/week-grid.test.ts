// Test-first (red): lib/src/dashboard/week-grid.ts is a typed throwing
// stub — `weekSeatGrid` is not implemented yet (tasks.md section 2.2).
//
// Contract this test file pins down (design.md Decision 3, baseline spec's
// "Concert-hall week schedule (HallMap)" requirement, BC-SCHEDULE-01):
//   `weekSeatGrid(weekStartIso: string) -> SeatCoordinate[]` is PURE — no
//   `Date.now()`, "now" is always the caller's argument. `weekStartIso` is
//   a "YYYY-MM-DD" Europe/Kyiv wall-clock local calendar date, ANY day of
//   the target week (not necessarily a Monday) — the function resolves to
//   the Mon-Fri span of the ISO week containing that date and returns
//   exactly 5 weekdays x 10 hourly-start seats (10:00 through 19:00
//   inclusive = 50 SeatCoordinates total). Saturday/Sunday are NEVER
//   present, regardless of which weekday `weekStartIso` itself falls on.
import { describe, expect, it } from "vitest";
import { weekSeatGrid } from "./week-grid.ts";

const HOUR_STARTS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

/** 0 = Sunday .. 6 = Saturday, same UTC-midnight-anchored calendar-date
 * arithmetic as lib/src/slots/grid.test.ts's own `weekdayIndex` helper. */
function weekdayIndex(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

describe("weekSeatGrid (FR-DASH-03, BC-SCHEDULE-01)", () => {
  it("returns exactly 5 weekday rows (Mon-Fri) x 10 hourly seats (10:00-19:00 starts) for a known Monday week-start", () => {
    const seats = weekSeatGrid("2026-07-06"); // Monday

    expect(seats).toHaveLength(50);

    const weekdaysPresent = [...new Set(seats.map((s) => s.weekday))].sort((a, b) => a - b);
    expect(weekdaysPresent).toEqual([1, 2, 3, 4, 5]);

    for (const seat of seats) {
      expect(HOUR_STARTS).toContain(seat.hour);

      const date = seat.slotStartIso.slice(0, 10);
      const time = seat.slotStartIso.slice(11, 16);
      expect(time).toBe(`${String(seat.hour).padStart(2, "0")}:00`);

      const dow = weekdayIndex(date);
      expect(dow).toBeGreaterThanOrEqual(1);
      expect(dow).toBeLessThanOrEqual(5);
      expect(dow).toBe(seat.weekday);
    }

    // Exactly 10 seats per weekday row.
    for (const weekday of [1, 2, 3, 4, 5]) {
      expect(seats.filter((s) => s.weekday === weekday)).toHaveLength(10);
    }
  });

  // @trace FR-DASH-03
  // @trace BC-SCHEDULE-01
  it("never includes Saturday or Sunday, even when weekStartIso is itself a Saturday", () => {
    const fromMonday = weekSeatGrid("2026-07-06"); // Monday of the week
    const fromSaturday = weekSeatGrid("2026-07-11"); // Saturday of the SAME week

    // Same calendar week -> identical grid, proving the function resolves
    // to the week's Mon-Fri span rather than echoing the input weekday
    // verbatim (which would wrongly anchor Saturday itself as a "row").
    expect(fromSaturday).toEqual(fromMonday);

    for (const seat of fromSaturday) {
      const dow = weekdayIndex(seat.slotStartIso.slice(0, 10));
      expect(dow).not.toBe(0); // Sunday
      expect(dow).not.toBe(6); // Saturday
    }
  });

  // @trace FR-DASH-03
  it("is pure and deterministic given its argument: repeated calls with the same weekStartIso yield an identical result, and Date.now() is never read", () => {
    const originalDateNow = Date.now;
    Date.now = () => {
      throw new Error("weekSeatGrid() must never read the clock -- pass weekStartIso as an argument");
    };

    try {
      const first = weekSeatGrid("2026-07-06");
      const second = weekSeatGrid("2026-07-06");
      expect(second).toEqual(first);
    } finally {
      Date.now = originalDateNow;
    }
  });
});
