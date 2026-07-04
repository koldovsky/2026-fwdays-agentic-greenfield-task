import { describe, expect, it } from "vitest";
import { openDatabase } from "./index.js";
import { insertBooking, updateBookingStatus } from "./bookings.js";

describe("insertBooking (TC-DATA-01)", () => {
  // @trace FR-SLOT-02
  it("persists a pending row and returns it with id/created_at populated", () => {
    const db = openDatabase(":memory:");

    const row = insertBooking(db, {
      slotStart: "2026-07-06T10:00:00.000Z",
      slotEnd: "2026-07-06T11:00:00.000Z",
      status: "pending",
      calendarEventId: "evt-123",
    });

    expect(row.id).toBeGreaterThan(0);
    expect(row.slot_start).toBe("2026-07-06T10:00:00.000Z");
    expect(row.slot_end).toBe("2026-07-06T11:00:00.000Z");
    expect(row.status).toBe("pending");
    expect(row.calendar_event_id).toBe("evt-123");
    expect(row.created_at).toBeTruthy();

    const fromDb = db.prepare("SELECT * FROM bookings WHERE id = ?").get(row.id);
    expect(fromDb).toEqual(row);

    db.close();
  });

  it("defaults calendar_event_id to null when omitted", () => {
    const db = openDatabase(":memory:");

    const row = insertBooking(db, {
      slotStart: "2026-07-06T10:00:00.000Z",
      slotEnd: "2026-07-06T11:00:00.000Z",
      status: "pending",
    });

    expect(row.calendar_event_id).toBeNull();

    db.close();
  });

  it("rejects a bogus status via the CHECK constraint (same guard as raw SQL)", () => {
    const db = openDatabase(":memory:");

    expect(() =>
      insertBooking(db, {
        slotStart: "2026-07-06T10:00:00.000Z",
        slotEnd: "2026-07-06T11:00:00.000Z",
        // @ts-expect-error — deliberately bogus to exercise the CHECK constraint.
        status: "bogus",
      }),
    ).toThrow(/CHECK constraint failed/);

    db.close();
  });
});

describe("updateBookingStatus (TC-DATA-01)", () => {
  // @trace FR-SLOT-02
  it("moves a pending row to a terminal status and returns 1 row changed", () => {
    const db = openDatabase(":memory:");
    const row = insertBooking(db, {
      slotStart: "2026-07-06T10:00:00.000Z",
      slotEnd: "2026-07-06T11:00:00.000Z",
      status: "pending",
      calendarEventId: "evt-123",
    });

    const changes = updateBookingStatus(db, row.id, "cancelled");

    expect(changes).toBe(1);
    const updated = db.prepare("SELECT status FROM bookings WHERE id = ?").get(row.id) as {
      status: string;
    };
    expect(updated.status).toBe("cancelled");

    db.close();
  });

  it("returns 0 changes for a nonexistent id, without throwing", () => {
    const db = openDatabase(":memory:");

    const changes = updateBookingStatus(db, 999999, "cancelled");

    expect(changes).toBe(0);

    db.close();
  });

  it("rejects a bogus target status via the CHECK constraint", () => {
    const db = openDatabase(":memory:");
    const row = insertBooking(db, {
      slotStart: "2026-07-06T10:00:00.000Z",
      slotEnd: "2026-07-06T11:00:00.000Z",
      status: "pending",
    });

    expect(() =>
      // @ts-expect-error — deliberately bogus to exercise the CHECK constraint.
      updateBookingStatus(db, row.id, "bogus"),
    ).toThrow(/CHECK constraint failed/);

    db.close();
  });
});
