// TYPED THROWING STUB — red state for `dashboard` tasks.md section 2 (2.1).
// The signature and types below are the contract pinned by
// hall-status.test.ts; the body is implemented in tasks.md section 3 (3.1).
// No logic lives here yet.
//
// Framework-free pure core (TC-PURE-01): no Date.now(), no I/O, no SDKs —
// deliberately NOT importing `BookingStatus` from `@kamerton/db` (lib/ has
// zero package dependencies, per S1/S2 precedent); this narrow union
// mirrors `packages/db/src/schema.ts`'s `BOOKING_STATUSES` values.

export type BookingStatus = "pending" | "confirmed" | "declined" | "cancelled";

/**
 * A seat's rendered status on the HallMap (FR-DASH-03). Distinct from
 * `BookingStatus`: a seat can carry several bookings at once (a released
 * slot gets re-booked), so `SeatStatus` is the *precedence-resolved*
 * verdict across all of a seat's bookings this week, not a single row's
 * status. `"free"` has no `BookingStatus` counterpart (zero bookings).
 */
export type SeatStatus = "free" | "pending" | "confirmed" | "cancelled";

/**
 * Resolves one seat's rendered color from all of its bookings this week
 * (design.md Decision 3, baseline spec's HallMap requirement). Precedence,
 * highest wins: `confirmed` > `pending` > `cancelled`/`declined` (both
 * render `"cancelled"`, the slate token) > `"free"` (zero bookings). A seat
 * whose only bookings are released (`cancelled`/`declined`) renders
 * `"cancelled"` — it never reverts to `"free"`.
 */
export function hallSeatStatus(bookings: { status: BookingStatus }[]): SeatStatus {
  let hasPending = false;
  let hasReleased = false;

  for (const booking of bookings) {
    if (booking.status === "confirmed") {
      return "confirmed";
    }
    if (booking.status === "pending") {
      hasPending = true;
    } else if (booking.status === "cancelled" || booking.status === "declined") {
      hasReleased = true;
    }
  }

  if (hasPending) {
    return "pending";
  }
  if (hasReleased) {
    return "cancelled";
  }
  return "free";
}
