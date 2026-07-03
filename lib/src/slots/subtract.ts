// TYPED THROWING STUB — red state for tasks.md section 2. The signature and
// types below are the contract pinned by subtract.test.ts (and reused by
// grid.test.ts's "calendar cannot add slots" case); the body is implemented
// in tasks.md section 3 (3.2). No logic lives here yet.
//
// Framework-free pure core (TC-PURE-01).

import type { Slot } from "./grid";

/**
 * A busy interval in Europe/Kyiv wall-clock LOCAL "YYYY-MM-DDTHH:mm" form,
 * occupying the half-open interval [start, end) (design.md Decision 4).
 * Calendar busy intervals AND other leads' pending-hold tentative-event
 * intervals share this one shape — no special-casing (FR-SLOT-01).
 */
export interface BusyInterval {
  start: string;
  end: string;
}

/**
 * Half-open interval subtraction (design.md Decision 4, the single shared
 * disqualification predicate): a slot is removed iff
 * `slot.start < busy.end AND busy.start < slot.end` for any busy interval.
 * Touching boundaries do NOT overlap. Subtraction only ever removes slots
 * from `slots`, never adds (FR-GUARD-03).
 */
export function subtractBusy(slots: Slot[], busy: BusyInterval[]): Slot[] {
  void slots;
  void busy;
  throw new Error(
    "Not implemented: subtractBusy (red — implemented in tasks.md section 3)",
  );
}
