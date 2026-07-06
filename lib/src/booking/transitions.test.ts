// Test-first (red): lib/src/booking/transitions.ts's `applyBookingDecision`
// body is a Not-implemented throwing stub (booking-hitl tasks.md A.3's red
// half) — every case below is expected to FAIL against the stub, for the
// right reason, until A.4 implements the real body.
//
// Contract this file pins down (design.md Decision 3, baseline spec.md
// "Booking decision state transitions"): `applyBookingDecision` is the
// ENTIRE guardrail "only a `pending` booking may transition" — confirm ->
// confirmed, decline -> declined, propose_another_time -> cancelled, all
// three ONLY from `pending`; every decision against a non-pending status is
// rejected `NOT_PENDING`, never throws.
import { describe, expect, it } from "vitest";
import { applyBookingDecision, type BookingDecision, type BookingStatus } from "./transitions.ts";

describe("applyBookingDecision — pending -> terminal (baseline spec.md)", () => {
  // @trace FR-HITL-03
  it('confirm("pending") -> { ok: true, nextStatus: "confirmed" }', () => {
    expect(applyBookingDecision("pending", "confirm")).toEqual({
      ok: true,
      nextStatus: "confirmed",
    });
  });

  // @trace FR-HITL-03
  it('decline("pending") -> { ok: true, nextStatus: "declined" }', () => {
    expect(applyBookingDecision("pending", "decline")).toEqual({
      ok: true,
      nextStatus: "declined",
    });
  });

  // @trace FR-HITL-03
  it('propose_another_time("pending") -> { ok: true, nextStatus: "cancelled" } (superseded, not a lead cancellation)', () => {
    expect(applyBookingDecision("pending", "propose_another_time")).toEqual({
      ok: true,
      nextStatus: "cancelled",
    });
  });
});

describe('applyBookingDecision — "Decision on a request no longer pending is rejected" (baseline spec.md scenario)', () => {
  const NON_PENDING_STATUSES: BookingStatus[] = ["confirmed", "declined", "cancelled"];
  const DECISIONS: BookingDecision[] = ["confirm", "decline", "propose_another_time"];

  // @trace FR-HITL-03
  it.each(NON_PENDING_STATUSES.flatMap((status) => DECISIONS.map((decision) => [status, decision] as const)))(
    'every decision against a "%s" booking is rejected NOT_PENDING (decision: %s)',
    (status, decision) => {
      const result = applyBookingDecision(status, decision);
      expect(result).toEqual({ ok: false, error: "NOT_PENDING" });
    },
  );
});
