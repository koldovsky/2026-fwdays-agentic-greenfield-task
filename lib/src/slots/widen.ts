// TYPED THROWING STUB — red state for tasks.md section 2. The signature and
// types below are the contract pinned by widen.test.ts; the body is
// implemented in tasks.md section 3 (3.4). No logic lives here yet.
//
// Framework-free pure core (TC-PURE-01). The widening algorithm composes
// grid + subtract + rankSlots(): it decides WHICH candidate pool to rank,
// never how to rank within a pool (design.md Decision 5).

import { generateGrid, type Slot } from "./grid.ts";
import { subtractBusy, type BusyInterval } from "./subtract.ts";
import { rankSlots, type Preferences, type RankedSlot } from "./rank.ts";

/** The narrowest widening step that supplied the proposal pool (FR-SLOT-03):
 *  "none" — the lead's original window already had >= 2 matches;
 *  "time" — Step 1 (±60min, same weekdays, clipped to the grid);
 *  "day"  — Step 2 (Step 1 window + Mon–Fri-adjacent weekdays);
 *  "grid" — Step 3 (entire Mon–Fri grid, preference ignored). */
export type WidenedStep = "none" | "time" | "day" | "grid";

export interface WidenParams {
  /** First day of the horizon, Europe/Kyiv LOCAL "YYYY-MM-DD" — explicit,
   *  never an implicit "today" (same purity discipline as rankSlots()). */
  from: string;
  /** Horizon length in calendar days (production always passes 14). */
  days: number;
  /** Calendar busy + other leads' pending-hold intervals, one shape. */
  busy: BusyInterval[];
  preferences: Preferences;
}

export interface WidenResult {
  /** 2–3 proposal slots, ranked by rankSlots() within their pool; `[]` only
   *  when `noFreeTimes` is true. */
  slots: RankedSlot[];
  widened: WidenedStep;
  /** Explicit true-zero signal — the lead never receives an empty/silent
   *  result (FR-SLOT-03). */
  noFreeTimes: boolean;
}

/**
 * Deterministic, ordered widening (FR-SLOT-03): stop at the first step whose
 * cumulative candidate pool reaches 2 free slots; fill remaining seats from
 * the next step only if needed. Adjacency is Mon–Fri only — Monday's sole
 * neighbor is Tuesday, Friday's is Thursday, mid-week gets both; never a
 * cyclic wraparound.
 */
/** Mon-Fri chain, in order — used to compute adjacency without any cyclic
 * wraparound (Monday's only neighbor is Tuesday, Friday's only neighbor is
 * Thursday). */
const WEEKDAY_CHAIN = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const GRID_FIRST_START = "10:00";
const GRID_LAST_START_EXCLUSIVE = "20:00"; // one past the 19:00 last start.

/** Weekday abbreviation ("Mon".."Sun") of a "YYYY-MM-DD" calendar date —
 * calendar-date arithmetic only, same UTC-midnight trick used across the
 * slots modules (a calendar date's weekday does not depend on a timezone). */
function weekdayAbbrev(dateStr: string): string {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dow = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return names[dow] ?? "Sun";
}

/** Mon-Fri-adjacent weekday(s) of `day`, never a cyclic wraparound. */
function adjacentWeekdays(day: string): string[] {
  const idx = WEEKDAY_CHAIN.indexOf(day);
  if (idx === -1) return [];
  const neighbors: string[] = [];
  const prev = idx - 1 >= 0 ? WEEKDAY_CHAIN[idx - 1] : undefined;
  const next = idx + 1 < WEEKDAY_CHAIN.length ? WEEKDAY_CHAIN[idx + 1] : undefined;
  if (prev !== undefined) neighbors.push(prev);
  if (next !== undefined) neighbors.push(next);
  return neighbors;
}

/** Union of `weekdays` with each one's Mon-Fri-adjacent neighbor(s) (Step 2). */
function widenWeekdays(weekdays: string[]): string[] {
  const set = new Set(weekdays);
  for (const day of weekdays) {
    for (const neighbor of adjacentWeekdays(day)) set.add(neighbor);
  }
  return Array.from(set);
}

/** Extend a time-of-day window by 60 minutes on both ends, clipped to the
 * grid's 10:00-19:00 start bounds (Step 1). */
function widenTimeWindow(window: { start: string; end: string }): {
  start: string;
  end: string;
} {
  const earlier = shiftTimeOfDay(window.start, -60);
  const later = shiftTimeOfDay(window.end, 60);
  return {
    start: earlier < GRID_FIRST_START ? GRID_FIRST_START : earlier,
    end: later > GRID_LAST_START_EXCLUSIVE ? GRID_LAST_START_EXCLUSIVE : later,
  };
}

/** Add (or subtract, via a negative delta) whole minutes to a fixed-width
 * "HH:mm" time-of-day string, zero-padded, clamped to a single calendar day. */
function shiftTimeOfDay(hhmm: string, deltaMinutes: number): string {
  const totalMinutes = Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
  const shifted = Math.min(24 * 60, Math.max(0, totalMinutes + deltaMinutes));
  const hour = Math.floor(shifted / 60);
  const minute = shifted % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Slots from `pool` whose weekday is in `weekdays` and whose start
 * time-of-day falls within the half-open `window`. */
function filterByWeekdaysAndWindow(
  pool: Slot[],
  weekdays: string[],
  window: { start: string; end: string },
): Slot[] {
  return pool.filter((slot) => {
    const date = slot.start.slice(0, 10);
    const time = slot.start.slice(11, 16);
    return weekdays.includes(weekdayAbbrev(date)) && time >= window.start && time < window.end;
  });
}

export function widenAndRank(params: WidenParams): WidenResult {
  const { from, days, busy, preferences } = params;

  const grid = generateGrid(from, days);
  const freeAll = subtractBusy(grid, busy);

  const rank = (pool: Slot[]): RankedSlot[] =>
    rankSlots(pool, preferences, busy).slice(0, 3);

  // Step 0 — the lead's original stated window, no widening.
  const originalMatches = filterByWeekdaysAndWindow(
    freeAll,
    preferences.weekdays,
    preferences.timeWindow,
  );
  if (originalMatches.length >= 2) {
    return { slots: rank(originalMatches), widened: "none", noFreeTimes: false };
  }

  // Step 1 — time widening, same weekdays.
  const widenedWindow = widenTimeWindow(preferences.timeWindow);
  const timeMatches = filterByWeekdaysAndWindow(freeAll, preferences.weekdays, widenedWindow);
  if (timeMatches.length >= 2) {
    return { slots: rank(timeMatches), widened: "time", noFreeTimes: false };
  }

  // Step 2 — day widening, Mon-Fri-adjacent weekdays added, Step 1's window kept.
  const dayWidenedWeekdays = widenWeekdays(preferences.weekdays);
  const dayMatches = filterByWeekdaysAndWindow(freeAll, dayWidenedWeekdays, widenedWindow);
  if (dayMatches.length >= 2) {
    return { slots: rank(dayMatches), widened: "day", noFreeTimes: false };
  }

  // Step 3 — the entire Mon-Fri grid across the horizon, preference ignored
  // for pool selection (ranking within the pool still applies rankSlots()'s
  // ordinary preference-fit criterion — design.md Decision 5).
  if (freeAll.length === 0) {
    return { slots: [], widened: "grid", noFreeTimes: true };
  }
  return { slots: rank(freeAll), widened: "grid", noFreeTimes: false };
}
