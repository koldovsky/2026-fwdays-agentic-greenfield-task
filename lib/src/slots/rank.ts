// TYPED THROWING STUB — red state for tasks.md section 2. The signature and
// types below are the contract pinned by rank.test.ts; the body is
// implemented in tasks.md section 3 (3.3). No logic lives here yet.
//
// Framework-free pure core (TC-PURE-01): rankSlots() is pure — no
// Date.now(), no I/O; "now" and the busy list are always arguments
// (design.md Decision 5).

import type { Slot } from "./grid";
import type { BusyInterval } from "./subtract";

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
export function rankSlots(
  freeSlots: Slot[],
  preferences: Preferences,
  existingBusyIntervals: BusyInterval[],
): RankedSlot[] {
  void freeSlots;
  void preferences;
  void existingBusyIntervals;
  throw new Error(
    "Not implemented: rankSlots (red — implemented in tasks.md section 3)",
  );
}
