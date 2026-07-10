// apps/dashboard/lib/upcoming-bookings — PURE: the confirmed/pending bookings
// that fall BEYOND the current week's HallMap grid, so the teacher panel can
// list lessons the week-scoped grid can't show (a confirmed lesson next week,
// a pending hold for a later week). Client-safe (no Node imports): derived
// entirely from the snapshot data the dashboard already holds.

import type { ConfirmedBooking, PendingQueueEntry } from "./dashboard-state.ts";

export interface UpcomingBooking {
  requestId: number;
  studentName: string | null;
  slotStart: string;
  status: "confirmed" | "pending";
}

/** The date part ("YYYY-MM-DD") of an ISO-like slot string, or "" when the
 *  value is missing/too short. A live BOOKING_PENDING event carries only
 *  {requestId, bookingId} (no slotStart), so a merged pending entry's
 *  slotStart can be undefined — this must never throw (admin-crash regression).
 *  Read as literal characters (timezone-safe, same discipline as
 *  `dashboard-state.ts`). */
const dateOf = (isoLike: string | undefined): string =>
  typeof isoLike === "string" && isoLike.length >= 10 ? isoLike.slice(0, 10) : "";

/**
 * Bookings whose date is strictly AFTER the grid's last day — i.e. upcoming
 * lessons the current-week grid doesn't cover. Past-week bookings (before the
 * grid) are excluded (not "upcoming"). Sorted by slot start, ascending.
 *
 * `gridSlotIsos` are the HallMap seats' `slotStartIso` values (the rendered
 * week); their max date is the grid's last day.
 */
export function upcomingBeyondGrid(
  gridSlotIsos: string[],
  confirmedBookings: ConfirmedBooking[],
  pendingQueue: PendingQueueEntry[],
): UpcomingBooking[] {
  if (gridSlotIsos.length === 0) return [];
  let lastGridDate = "";
  for (const iso of gridSlotIsos) {
    const d = dateOf(iso);
    if (d > lastGridDate) lastGridDate = d;
  }

  const out: UpcomingBooking[] = [];
  for (const b of confirmedBookings) {
    if (dateOf(b.slotStart) > lastGridDate) {
      out.push({ requestId: b.requestId, studentName: b.studentName, slotStart: b.slotStart, status: "confirmed" });
    }
  }
  for (const p of pendingQueue) {
    if (dateOf(p.slotStart) > lastGridDate) {
      out.push({ requestId: p.requestId, studentName: p.studentName, slotStart: p.slotStart, status: "pending" });
    }
  }
  out.sort((a, b) => (a.slotStart < b.slotStart ? -1 : a.slotStart > b.slotStart ? 1 : 0));
  return out;
}
