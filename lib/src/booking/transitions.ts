// TYPED THROWING STUB — red state for booking-hitl tasks.md A.3/A.4. The
// types and `applyBookingDecision` signature below are the contract pinned
// by transitions.test.ts; the body is implemented in A.4. No logic lives
// here yet — same "single Not-implemented throw" convention as S1's
// grid.ts/hold.ts red rounds.
//
// Framework-free pure core (TC-PURE-01): no I/O, no Date.now(). Deliberately
// NOT importing `BookingStatus` from `@kamerton/db` — lib/ has zero package
// dependencies (S1/S2/S3 precedent, e.g. `dashboard/hall-status.ts`'s own
// header comment); this narrow union mirrors
// `packages/db/src/schema.ts`'s `BOOKING_STATUSES` values.
//
// CONTRACT (design.md Decision 3, baseline spec.md "Booking decision state
// transitions"): the ENTIRE guardrail this function embodies is "only a
// `pending` booking may transition" — every decision against a
// non-`pending` current status is rejected `NOT_PENDING`, never throws, and
// never touches the calendar or the DB (those are the caller's job, kept
// separate per Decision 5).

/** Mirrors `packages/db/src/schema.ts`'s `BookingStatus` — see header
 *  comment above for why this is a local literal union, not an import. */
export type BookingStatus = "pending" | "confirmed" | "declined" | "cancelled";

/** The three admin decisions FR-HITL-01 offers on a `pending` request. */
export type BookingDecision = "confirm" | "decline" | "propose_another_time";

export type BookingDecisionResult =
  | { ok: true; nextStatus: "confirmed" | "declined" | "cancelled" }
  | { ok: false; error: "NOT_PENDING" };

/**
 * Pure, synchronous. `confirm` -> `confirmed`; `decline` -> `declined`;
 * `propose_another_time` -> `cancelled` (superseded by the re-proposal,
 * spec.md's own wording) — all three ONLY from `currentStatus === "pending"`.
 * Every other `currentStatus` rejects every decision with `NOT_PENDING`
 * (spec.md's "Decision on a request no longer pending is rejected" scenario).
 */
export function applyBookingDecision(
  currentStatus: BookingStatus,
  decision: BookingDecision,
): BookingDecisionResult {
  if (currentStatus !== "pending") {
    return { ok: false, error: "NOT_PENDING" };
  }

  switch (decision) {
    case "confirm":
      return { ok: true, nextStatus: "confirmed" };
    case "decline":
      return { ok: true, nextStatus: "declined" };
    case "propose_another_time":
      return { ok: true, nextStatus: "cancelled" };
  }
}
