// TYPED THROWING STUB — red state for `dashboard` tasks.md section 2 (2.2).
// The signature and types below are the contract pinned by
// week-grid.test.ts; the body is implemented in tasks.md section 3 (3.2).
// No logic lives here yet.
//
// Framework-free pure core (TC-PURE-01): no Date.now(), no I/O, no timezone
// library — same calendar-date-arithmetic discipline as
// `lib/src/slots/grid.ts`'s `generateGrid()` (UTC-midnight-anchored `Date`
// math on a "YYYY-MM-DD" string is timezone-safe because a calendar date's
// weekday does not depend on a timezone).

/**
 * One HallMap seat's fixed position (design.md Decision 3, BC-SCHEDULE-01):
 * a weekday row crossed with an hourly-start column.
 */
export interface SeatCoordinate {
  /** ISO weekday number, 1 = Monday .. 5 = Friday — never 6 (Sat) or 0/7
   *  (Sun), per BC-SCHEDULE-01's Mon-Fri-only grid. Matches the same
   *  `Date.prototype.getUTCDay()` numbering `lib/src/slots/grid.ts` uses. */
  weekday: number;
  /** Hour-of-day the seat's 60-minute slot starts, 10..19 inclusive,
   *  Europe/Kyiv wall-clock (BC-SCHEDULE-01). */
  hour: number;
  /** Fixed-width "YYYY-MM-DDTHH:mm" Europe/Kyiv wall-clock LOCAL slot start
   *  — same shape as `lib/src/slots/grid.ts`'s `Slot.start` (no UTC offset,
   *  no "Z"; lib/ never touches a timezone library). */
  slotStartIso: string;
}

/**
 * The current week's HallMap seat grid (FR-DASH-03), pure given a week-start
 * date: resolves to the Mon-Fri span of the ISO week CONTAINING
 * `weekStartIso` (a "YYYY-MM-DD" Europe/Kyiv wall-clock local calendar
 * date — any day of the target week, not necessarily a Monday), and returns
 * exactly 5 weekdays x 10 hourly-start seats (50 `SeatCoordinate`s).
 * Saturday/Sunday are never present, regardless of `weekStartIso`'s own
 * weekday. Never reads `Date.now()` — "now" is always the caller's argument
 * (same purity discipline as `rankSlots()`/`generateGrid()`).
 */
/** Fixed hourly-start seats, 10:00 through 19:00 inclusive (BC-SCHEDULE-01). */
const HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

/**
 * Weekday of a "YYYY-MM-DD" calendar date, 0 = Sunday .. 6 = Saturday. Same
 * UTC-midnight-anchored calendar-date arithmetic as `lib/src/slots/grid.ts`
 * (a calendar date's weekday does not depend on a timezone).
 */
function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

/** Zero-padded "YYYY-MM-DD" for a UTC-midnight-anchored calendar date. */
function toDateStr(utcMidnight: Date): string {
  const y = utcMidnight.getUTCFullYear();
  const m = String(utcMidnight.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utcMidnight.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function weekSeatGrid(weekStartIso: string): SeatCoordinate[] {
  const [y, m, d] = weekStartIso.split("-").map(Number) as [number, number, number];
  const baseMillis = Date.UTC(y, m - 1, d);
  const dow = weekdayOf(weekStartIso); // 0 = Sunday .. 6 = Saturday
  // Offset back to this ISO week's Monday: Sunday (0) is 6 days after Monday.
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  const mondayMillis = baseMillis + offsetToMonday * 24 * 60 * 60 * 1000;

  const seats: SeatCoordinate[] = [];
  for (let weekday = 1; weekday <= 5; weekday++) {
    const dayMillis = mondayMillis + (weekday - 1) * 24 * 60 * 60 * 1000;
    const dateStr = toDateStr(new Date(dayMillis));
    for (const hour of HOURS) {
      const hourStr = String(hour).padStart(2, "0");
      seats.push({
        weekday,
        hour,
        slotStartIso: `${dateStr}T${hourStr}:00`,
      });
    }
  }

  return seats;
}
