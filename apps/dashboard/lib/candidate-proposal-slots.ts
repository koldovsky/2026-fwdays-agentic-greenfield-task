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
// TYPED THROWING STUB — red state for the DecisionBar slot-picker's red
// round (`candidate-proposal-slots.test.ts` pins the contract below FIRST,
// confirmed red against this stub). The body is implemented alongside the
// real inline picker (green half); no logic lives here yet — same
// single-throw convention `lib/`'s own red-round stubs use (see e.g.
// `lib/src/booking/validate-admin-slots.ts`'s header comment).

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
  throw new Error(
    "Not implemented — candidateProposalSlots (booking-hitl S4, DecisionBar slot-picker red round)",
  );
}
