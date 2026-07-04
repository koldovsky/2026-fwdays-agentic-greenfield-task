// TYPED THROWING STUB — red state for tasks.md section 2. The signature and
// types below are the contract pinned by rank.test.ts; the body is
// implemented in tasks.md section 3 (3.3). No logic lives here yet.
//
// Framework-free pure core (TC-PURE-01): rankSlots() is pure — no
// Date.now(), no I/O; "now" and the busy list are always arguments
// (design.md Decision 5).

import type { Slot } from "./grid.ts";
import type { BusyInterval } from "./subtract.ts";
import { overlaps } from "./subtract.ts";

/**
 * The lead's stated scheduling preferences (FR-SLOT-04 criterion 1).
 * `weekdays` uses "Mon".."Fri" abbreviations; `timeWindow` bounds are
 * "HH:mm" Europe/Kyiv wall-clock time-of-day, half-open like the grid's
 * own slots.
 */
export interface Preferences {
  weekdays: string[];
  timeWindow: { start: string; end: string };
}

/**
 * A ranked slot. Structurally a Slot today; kept as a named alias so the
 * section-3 implementation may extend it (e.g. with score components)
 * without changing call sites.
 */
export type RankedSlot = Slot;

/**
 * Pure lexicographic ranking (design.md Decision 5, FR-SLOT-04) — ties fall
 * through, never combined into one weighted score:
 *   1. Preference fit (weekdays + time window).
 *   2. Teacher compactness — adjacency to an existing busy interval beats
 *      an isolated 60-minute gap.
 *   3. Earlier date, then earlier start time.
 */
/** The grid's fixed hour bounds (BC-SCHEDULE-01) — used only to detect a
 * "grid edge" neighbor (no slot exists before 10:00 or after the 19:00
 * start) for the compactness criterion. Not a timezone concern; a plain
 * domain constant duplicated from grid.ts's own bound rather than imported,
 * so rank.ts stays a self-contained pure module. */
const GRID_FIRST_START = "10:00";
const GRID_LAST_START = "19:00";

/** Weekday abbreviation ("Mon".."Sun") of a "YYYY-MM-DD" calendar date.
 * Calendar-date arithmetic only, same UTC-midnight-anchored trick as
 * grid.ts — a calendar date's weekday does not depend on a timezone. */
function weekdayAbbrev(dateStr: string): string {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dow = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return names[dow] ?? "Sun";
}

/** Add (or subtract, via a negative delta) whole minutes to a fixed-width
 * "HH:mm" time-of-day string, zero-padded, clamped to a single calendar day
 * [00:00, 24:00) — sufficient for this domain's on-the-hour arithmetic. */
function shiftTimeOfDay(hhmm: string, deltaMinutes: number): string {
  const totalMinutes = Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
  const shifted = Math.min(24 * 60, Math.max(0, totalMinutes + deltaMinutes));
  const hour = Math.floor(shifted / 60);
  const minute = shifted % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function fitsPreferences(slot: Slot, preferences: Preferences): boolean {
  const date = slot.start.slice(0, 10);
  const time = slot.start.slice(11, 16);
  const weekdayMatch = preferences.weekdays.includes(weekdayAbbrev(date));
  const timeMatch =
    time >= preferences.timeWindow.start && time < preferences.timeWindow.end;
  return weekdayMatch && timeMatch;
}

/**
 * Whether the position immediately before (`side: "before"`) or after
 * (`side: "after"`) `slot` is "blocked" — covered by an existing busy
 * interval, or outside the grid's 10:00-19:00 start bounds (a grid edge).
 * Both forms of "blocked" count identically for the compactness criterion
 * (design.md Decision 5 / rank.test.ts).
 */
function isBlocked(
  slot: Slot,
  side: "before" | "after",
  existingBusyIntervals: BusyInterval[],
): boolean {
  const date = slot.start.slice(0, 10);
  const startTime = slot.start.slice(11, 16);

  if (side === "before") {
    if (startTime === GRID_FIRST_START) {
      return true; // grid edge — no slot can exist before the day's first start.
    }
    const neighbor: Slot = {
      start: `${date}T${shiftTimeOfDay(startTime, -60)}`,
      end: slot.start,
    };
    return existingBusyIntervals.some((b) => overlaps(neighbor, b));
  }

  if (startTime === GRID_LAST_START) {
    return true; // grid edge — no slot can exist after the day's last start.
  }
  const endTime = slot.end.slice(11, 16);
  const neighbor: Slot = {
    start: slot.end,
    end: `${date}T${shiftTimeOfDay(endTime, 60)}`,
  };
  return existingBusyIntervals.some((b) => overlaps(neighbor, b));
}

/**
 * Compactness score: adjacency to busy on exactly ONE side (extends an
 * existing busy block while leaving the other side open) beats no adjacency
 * at all, which in turn beats being boxed in by busy/edge on BOTH sides (an
 * isolated, unfillable one-hour gap) — design.md Decision 5.
 */
function compactnessScore(slot: Slot, existingBusyIntervals: BusyInterval[]): number {
  const blockedBefore = isBlocked(slot, "before", existingBusyIntervals);
  const blockedAfter = isBlocked(slot, "after", existingBusyIntervals);
  const blockedCount = Number(blockedBefore) + Number(blockedAfter);
  if (blockedCount === 1) return 2;
  if (blockedCount === 0) return 1;
  return 0;
}

export function rankSlots(
  freeSlots: Slot[],
  preferences: Preferences,
  existingBusyIntervals: BusyInterval[],
): RankedSlot[] {
  return freeSlots.slice().sort((a, b) => {
    const fitA = fitsPreferences(a, preferences) ? 1 : 0;
    const fitB = fitsPreferences(b, preferences) ? 1 : 0;
    if (fitA !== fitB) return fitB - fitA;

    const compactA = compactnessScore(a, existingBusyIntervals);
    const compactB = compactnessScore(b, existingBusyIntervals);
    if (compactA !== compactB) return compactB - compactA;

    return a.start < b.start ? -1 : a.start > b.start ? 1 : 0;
  });
}
