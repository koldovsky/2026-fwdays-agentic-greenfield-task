// Test-first (red): `candidateProposalSlots` is a typed throwing stub
// (booking-hitl S4, DecisionBar slot-picker — review-gate CRITICAL finding:
// "Propose another time" used to POST `slots:[]` with no selection UI) —
// every case below is expected to FAIL against the stub until the green
// half implements the real derivation. `@trace FR-HITL-01`,
// `@trace FR-HITL-03`.

import { describe, expect, it } from "vitest";
import { weekSeatGrid } from "@kamerton/lib/src/dashboard/week-grid.ts";
import { isSlotOnGrid, type Slot } from "@kamerton/lib/src/slots/grid.ts";
import { candidateProposalSlots } from "./candidate-proposal-slots.ts";
import type { DashboardState, HallMapSeat } from "./dashboard-state.ts";

// A Monday — any "YYYY-MM-DD" inside the target week works (`weekSeatGrid`'s
// own contract), a Monday just keeps this fixture's seats easy to eyeball.
const WEEK_START_ISO = "2026-07-06";

function emptyDashboardState(hallMap: HallMapSeat[]): DashboardState {
  return { activeRequests: [], pendingQueue: [], hallMap, conversationMessages: {}, confirmedBookings: [] };
}

describe("candidateProposalSlots (booking-hitl S4, DecisionBar slot-picker)", () => {
  // @trace FR-HITL-03
  it("returns the full Mon-Fri 10:00-19:00 grid when every seat is free", () => {
    const hallMap: HallMapSeat[] = weekSeatGrid(WEEK_START_ISO).map((seat) => ({ ...seat, status: "free" as const }));
    const state = emptyDashboardState(hallMap);

    const result = candidateProposalSlots(state, WEEK_START_ISO);

    expect(result).toHaveLength(50); // 5 weekdays x 10 hourly-start seats
    expect(result.every(isSlotOnGrid)).toBe(true);
  });

  // @trace FR-HITL-01, FR-HITL-03 — the core review-gate-fix scenario: one
  // seat already taken by a pending/confirmed booking must NOT be offered
  // again as a candidate.
  it("returns the grid minus a seat already occupied by a pending booking, all on-grid", () => {
    const hallMap: HallMapSeat[] = weekSeatGrid(WEEK_START_ISO).map((seat) => ({ ...seat, status: "free" as const }));
    const occupiedSeat = hallMap[0]!;
    hallMap[0] = { ...occupiedSeat, status: "pending" };
    const state = emptyDashboardState(hallMap);

    const result = candidateProposalSlots(state, WEEK_START_ISO);

    expect(result).toHaveLength(49);
    expect(result.every(isSlotOnGrid)).toBe(true);
    expect(result.some((slot: Slot) => slot.start === occupiedSeat.slotStartIso)).toBe(false);
  });

  it("also excludes a confirmed seat, but keeps a cancelled seat as a valid candidate", () => {
    const hallMap: HallMapSeat[] = weekSeatGrid(WEEK_START_ISO).map((seat) => ({ ...seat, status: "free" as const }));
    const confirmedSeat = hallMap[1]!;
    const cancelledSeat = hallMap[2]!;
    hallMap[1] = { ...confirmedSeat, status: "confirmed" };
    hallMap[2] = { ...cancelledSeat, status: "cancelled" };
    const state = emptyDashboardState(hallMap);

    const result = candidateProposalSlots(state, WEEK_START_ISO);

    expect(result).toHaveLength(49); // only the confirmed seat is excluded
    expect(result.some((slot: Slot) => slot.start === confirmedSeat.slotStartIso)).toBe(false);
    expect(result.some((slot: Slot) => slot.start === cancelledSeat.slotStartIso)).toBe(true);
  });

  it("returns an empty array when every seat is occupied", () => {
    const hallMap: HallMapSeat[] = weekSeatGrid(WEEK_START_ISO).map((seat) => ({ ...seat, status: "confirmed" as const }));
    const state = emptyDashboardState(hallMap);

    const result = candidateProposalSlots(state, WEEK_START_ISO);

    expect(result).toEqual([]);
  });
});
