// TYPED THROWING STUB — red state for tasks.md section 2. The signature and
// types below are the contract pinned by widen.test.ts; the body is
// implemented in tasks.md section 3 (3.4). No logic lives here yet.
//
// Framework-free pure core (TC-PURE-01). The widening algorithm composes
// grid + subtract + rankSlots(): it decides WHICH candidate pool to rank,
// never how to rank within a pool (design.md Decision 5).

import type { BusyInterval } from "./subtract";
import type { Preferences, RankedSlot } from "./rank";

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
export function widenAndRank(params: WidenParams): WidenResult {
  void params;
  throw new Error(
    "Not implemented: widenAndRank (red — implemented in tasks.md section 3)",
  );
}
