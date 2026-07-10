// apps/dashboard/lib/upcoming-bookings — the bookings that fall BEYOND the
// current week's HallMap grid, so the teacher sees lessons the week-scoped
// grid can't show (e.g. a confirmed lesson next week).

import { describe, expect, it } from "vitest";
import { upcomingBeyondGrid } from "./upcoming-bookings.ts";
import type { ConfirmedBooking, PendingQueueEntry } from "./dashboard-state.ts";

// A Mon–Fri grid whose last day is 2026-07-10 (Friday).
const GRID = ["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10"].map((d) => `${d}T10:00`);

function confirmed(over: Partial<ConfirmedBooking> = {}): ConfirmedBooking {
  return { requestId: 1, studentName: "X", studentAge: 8, slotStart: "2026-07-08T15:00", slotEnd: "2026-07-08T16:00", ...over };
}
function pending(over: Partial<PendingQueueEntry> = {}): PendingQueueEntry {
  return {
    requestId: 2, leadId: 2, telegramChatId: "t", studentName: "Y", studentAge: 9,
    brief: "", bookingId: 2, calendarEventId: null,
    slotStart: "2026-07-09T11:00:00+03:00", slotEnd: "2026-07-09T12:00:00+03:00", ...over,
  };
}

describe("upcomingBeyondGrid", () => {
  it("returns only bookings whose date is after the grid's last day, sorted by start", () => {
    const res = upcomingBeyondGrid(
      GRID,
      [
        confirmed({ requestId: 3, studentName: "Оленка", slotStart: "2026-07-08T15:00" }), // in grid → excluded
        confirmed({ requestId: 7, studentName: "Віктор", slotStart: "2026-07-14T16:00" }), // next week → included
        confirmed({ requestId: 8, studentName: "Ніна", slotStart: "2026-07-21T10:00" }), // later → included
      ],
      [
        pending({ requestId: 2, studentName: "Марко", slotStart: "2026-07-09T11:00:00+03:00" }), // in grid → excluded
        pending({ requestId: 9, studentName: "Лев", slotStart: "2026-07-15T09:00:00+03:00" }), // next week → included
      ],
    );

    expect(res).toEqual([
      { requestId: 7, studentName: "Віктор", slotStart: "2026-07-14T16:00", status: "confirmed" },
      { requestId: 9, studentName: "Лев", slotStart: "2026-07-15T09:00:00+03:00", status: "pending" },
      { requestId: 8, studentName: "Ніна", slotStart: "2026-07-21T10:00", status: "confirmed" },
    ]);
  });

  it("excludes past-week bookings (before the grid) — only upcoming beyond the grid", () => {
    const res = upcomingBeyondGrid(GRID, [confirmed({ requestId: 4, studentName: "Стара", slotStart: "2026-06-30T10:00" })], []);
    expect(res).toEqual([]);
  });

  it("is empty when every booking is within the grid week", () => {
    expect(upcomingBeyondGrid(GRID, [confirmed({ slotStart: "2026-07-07T12:00" })], [pending({ slotStart: "2026-07-10T18:00" })])).toEqual([]);
  });

  // Regression (admin crash "Cannot read properties of undefined (reading
  // 'slice')"): a live BOOKING_PENDING event carries only {requestId,
  // bookingId} — no slotStart — so a merged pending entry can have an
  // undefined slotStart. It must be skipped, never dereferenced.
  it("skips a pending entry with a missing/invalid slotStart instead of throwing", () => {
    const half = { requestId: 42, slotStart: undefined } as unknown as PendingQueueEntry;
    expect(() => upcomingBeyondGrid(GRID, [], [half])).not.toThrow();
    expect(upcomingBeyondGrid(GRID, [], [half])).toEqual([]);
  });
});
