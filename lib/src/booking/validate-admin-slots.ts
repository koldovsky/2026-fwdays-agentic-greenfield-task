// TYPED THROWING STUB — red state for booking-hitl tasks.md A.5/A.6. The
// types and `validateAdminProposedSlots` signature below are the contract
// pinned by validate-admin-slots.test.ts; the body is implemented in A.6.
// No logic lives here yet — same "single Not-implemented throw" convention
// as S1's grid.ts/hold.ts red rounds.
//
// Framework-free pure core (TC-PURE-01): no I/O, no Date.now(). Reuses
// `Slot`/`isSlotOnGrid` from ../slots/grid.ts and `BusyInterval`/`overlaps`
// from ../slots/subtract.ts — "one shared predicate, never re-derived"
// (design.md Decision 3) — never re-deriving grid membership or interval
// overlap here.
//
// CONTRACT (design.md Decision 3, baseline spec.md "Admin-proposed slot
// validation"): checks run in a FIXED order, first violation wins,
// deterministic — empty selection -> grid membership -> free/busy and
// other-pending overlap. A slot that is BOTH off-grid and busy MUST report
// OFF_GRID (grid membership is checked before availability).

import { isSlotOnGrid, type Slot } from "../slots/grid.ts";
import { overlaps, type BusyInterval } from "../slots/subtract.ts";

export type AdminSlotValidationResult =
  | { ok: true }
  | { ok: false; code: "NO_SLOTS_SELECTED" }
  | { ok: false; code: "OFF_GRID"; slot: Slot }
  | { ok: false; code: "SLOT_UNAVAILABLE"; slot: Slot };

export interface ValidateAdminProposedSlotsInput {
  slots: Slot[];
  /** Fresh Kyiv-local free/busy (converted at the CalendarPort boundary,
   *  same convention as hold.ts). */
  busy: BusyInterval[];
  /** Other leads' pending holds, Kyiv-local — same shape as `busy`. */
  otherPendingSlots: Slot[];
}

/**
 * Pure, synchronous. See the file-level CONTRACT comment above for the
 * fixed check order this function must implement (A.6).
 */
export function validateAdminProposedSlots(
  input: ValidateAdminProposedSlotsInput,
): AdminSlotValidationResult {
  const { slots, busy, otherPendingSlots } = input;

  if (slots.length === 0) {
    return { ok: false, code: "NO_SLOTS_SELECTED" };
  }

  for (const slot of slots) {
    if (!isSlotOnGrid(slot)) {
      return { ok: false, code: "OFF_GRID", slot };
    }
  }

  for (const slot of slots) {
    const isBusy = busy.some((b) => overlaps(slot, b));
    const isHeldByOther = otherPendingSlots.some((other) => overlaps(slot, other));
    if (isBusy || isHeldByOther) {
      return { ok: false, code: "SLOT_UNAVAILABLE", slot };
    }
  }

  return { ok: true };
}
