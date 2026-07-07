// apps/dashboard/lib — candidateProposalSlots (booking-hitl S4, DecisionBar
// slot-picker: review-gate CRITICAL finding — "Propose another time" used
// to POST `slots:[]` with no selection UI at all, so the action could never
// succeed against the real `/api/decisions/[requestId]` contract,
// `@trace FR-HITL-01`, `@trace FR-HITL-03`). PURE derivation over the
// already-assembled `DashboardState` — lives in apps/dashboard/lib, never
// `lib/` (design.md Decision 3's "server-only glue... stays in
// apps/dashboard, never in lib/"; `dashboard-state.ts`'s own header makes
// the same call for `buildStateSnapshot`, for the same reason: the input
// type here, `DashboardState`, is itself an apps/dashboard shape, not a
// `lib/`-owned one).
//
// GREEN — implements the contract `candidate-proposal-slots.test.ts` pins
// (booking-hitl S4, DecisionBar slot-picker): `weekSeatGrid(weekStartIso)`'s
// full Mon-Fri 10:00-19:00 grid, minus every seat `state.hallMap` reports as
// currently occupied (`OCCUPIED_SEAT_STATUSES` below).

import { weekSeatGrid } from "@kamerton/lib/src/dashboard/week-grid.ts";
import type { Slot } from "@kamerton/lib/src/slots/grid.ts";
import type { DashboardState } from "./dashboard-state.ts";

/** HallMap seat statuses that mean "this seat is currently taken" — a
 *  `pending` hold or a `confirmed` booking. `free`/`cancelled` seats are
 *  still valid candidates: a released hold (decline/superseded proposal)
 *  reopens the seat for a brand-new proposal (`hall-status.ts`'s own
 *  precedence rule — a `cancelled` seat never implies "occupied"). */
const OCCUPIED_SEAT_STATUSES = new Set(["pending", "confirmed"]);

/**
 * The current week's on-grid candidate slots for the admin's "Propose
 * another time" picker (booking-hitl S4): `weekSeatGrid(weekStartIso)`'s
 * full Mon-Fri 10:00-19:00 grid, MINUS every seat `state.hallMap` already
 * reports as `pending`/`confirmed` this week. PURE — no `Date.now()`, no
 * I/O; `weekStartIso` is always an explicit caller argument, matching
 * `weekSeatGrid`'s own purity discipline so this function stays
 * deterministically testable for any week.
 */
export function candidateProposalSlots(state: DashboardState, weekStartIso: string): Slot[] {
  const occupiedSeatKeys = new Set(
    state.hallMap
      .filter((seat) => OCCUPIED_SEAT_STATUSES.has(seat.status))
      .map((seat) => seat.slotStartIso),
  );

  return weekSeatGrid(weekStartIso)
    .filter((seat) => !occupiedSeatKeys.has(seat.slotStartIso))
    .map((seat) => ({ start: seat.slotStartIso, end: addOneHour(seat.slotStartIso) }));
}

/** "YYYY-MM-DDTHH:mm" -> the same wall-clock date one hour later (grid slots
 *  are always 60 minutes, `lib/src/slots/grid.ts`'s own Decision 4 — no
 *  timezone library needed, `hour + 1` never crosses a calendar-date
 *  boundary since the grid's last hourly start is 19:00). */
function addOneHour(slotStartIso: string): string {
  const datePart = slotStartIso.slice(0, 10);
  const hour = Number(slotStartIso.slice(11, 13));
  const endHour = String(hour + 1).padStart(2, "0");
  return `${datePart}T${endHour}:00`;
}
