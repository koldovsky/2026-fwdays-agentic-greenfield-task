// Test-first (red): lib/src/booking/validate-admin-slots.ts's
// `validateAdminProposedSlots` body is a Not-implemented throwing stub
// (booking-hitl tasks.md A.5's red half) — every case below is expected to
// FAIL against the stub, for the right reason, until A.6 implements the
// real body.
//
// Contract this file pins down (design.md Decision 3, baseline spec.md's
// three "Admin-proposed slot" scenarios): checks run in order — empty
// selection -> grid membership (BC-SCHEDULE-01) -> free/busy and
// other-pending overlap — first violation wins, deterministic.
import { describe, expect, it } from "vitest";
import { validateAdminProposedSlots } from "./validate-admin-slots.ts";

// Reference week: 2026-07-06 is a Monday (same fixture Monday grid.test.ts
// uses), so 2026-07-07 is Tuesday, 2026-07-08 Wednesday, 2026-07-09
// Thursday, 2026-07-11 Saturday, 2026-07-12 Sunday.
const VALID_SLOT = { start: "2026-07-07T15:00", end: "2026-07-07T16:00" }; // Tuesday, on grid
const SATURDAY_SLOT = { start: "2026-07-11T15:00", end: "2026-07-11T16:00" };
const LATE_START_SLOT = { start: "2026-07-06T21:00", end: "2026-07-06T22:00" }; // Monday 21:00, off grid
const BUSY_TARGET_SLOT = { start: "2026-07-08T14:00", end: "2026-07-08T15:00" }; // Wednesday, on grid
const OTHER_PENDING_TARGET_SLOT = { start: "2026-07-09T16:00", end: "2026-07-09T17:00" }; // Thursday, on grid

describe('validateAdminProposedSlots — "Propose another time with zero slots selected is rejected"', () => {
  // @trace FR-HITL-03
  it("empty slots array -> NO_SLOTS_SELECTED", () => {
    const result = validateAdminProposedSlots({ slots: [], busy: [], otherPendingSlots: [] });
    expect(result).toEqual({ ok: false, code: "NO_SLOTS_SELECTED" });
  });
});

describe('validateAdminProposedSlots — "Admin-proposed slot outside the grid is rejected"', () => {
  // @trace BC-SCHEDULE-01
  it("a Saturday slot -> OFF_GRID naming the offending slot", () => {
    const result = validateAdminProposedSlots({
      slots: [SATURDAY_SLOT],
      busy: [],
      otherPendingSlots: [],
    });
    expect(result).toEqual({ ok: false, code: "OFF_GRID", slot: SATURDAY_SLOT });
  });

  // @trace BC-SCHEDULE-01
  it("a 21:00-start slot -> OFF_GRID naming the offending slot", () => {
    const result = validateAdminProposedSlots({
      slots: [LATE_START_SLOT],
      busy: [],
      otherPendingSlots: [],
    });
    expect(result).toEqual({ ok: false, code: "OFF_GRID", slot: LATE_START_SLOT });
  });
});

describe('validateAdminProposedSlots — "Admin-proposed slot that is busy or held is rejected"', () => {
  // @trace FR-HITL-03
  it("a slot overlapping a fresh busy interval -> SLOT_UNAVAILABLE", () => {
    const result = validateAdminProposedSlots({
      slots: [BUSY_TARGET_SLOT],
      busy: [BUSY_TARGET_SLOT],
      otherPendingSlots: [],
    });
    expect(result).toEqual({ ok: false, code: "SLOT_UNAVAILABLE", slot: BUSY_TARGET_SLOT });
  });

  // @trace FR-HITL-03
  it("a slot overlapping another lead's otherPendingSlots entry -> SLOT_UNAVAILABLE", () => {
    const result = validateAdminProposedSlots({
      slots: [OTHER_PENDING_TARGET_SLOT],
      busy: [],
      otherPendingSlots: [OTHER_PENDING_TARGET_SLOT],
    });
    expect(result).toEqual({ ok: false, code: "SLOT_UNAVAILABLE", slot: OTHER_PENDING_TARGET_SLOT });
  });
});

describe("validateAdminProposedSlots — a fully valid slot passes", () => {
  // @trace FR-HITL-03
  // @trace BC-SCHEDULE-01
  it("an on-grid, free, unheld slot -> { ok: true }", () => {
    const result = validateAdminProposedSlots({
      slots: [VALID_SLOT],
      busy: [],
      otherPendingSlots: [],
    });
    expect(result).toEqual({ ok: true });
  });
});

describe("validateAdminProposedSlots — deterministic check order (empty -> grid -> availability)", () => {
  // @trace BC-SCHEDULE-01
  // @trace FR-HITL-03
  it("a slot that is BOTH off-grid and busy reports OFF_GRID, never SLOT_UNAVAILABLE", () => {
    const result = validateAdminProposedSlots({
      slots: [SATURDAY_SLOT],
      busy: [SATURDAY_SLOT], // also busy — grid membership must still win
      otherPendingSlots: [],
    });
    expect(result).toEqual({ ok: false, code: "OFF_GRID", slot: SATURDAY_SLOT });
  });
});
