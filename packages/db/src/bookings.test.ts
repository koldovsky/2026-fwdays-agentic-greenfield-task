import { describe, expect, it } from "vitest";
import { openDatabase } from "./index.ts";
import { insertBooking, updateBookingStatus } from "./bookings.ts";
import { insertLead } from "./leads.ts";
import { insertRequest } from "./requests.ts";

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

  // --- S4 booking-hitl Stage B (RED): request_id + Kyiv-offset slot_start
  // write contract (tasks.md B.5, design.md Decision 4 item 3 / Decision 6
  // item 4). ---

  // @trace FR-HITL-02
  it("persists and returns request_id when provided (booking-hitl B.5)", () => {
    const db = openDatabase(":memory:");
    const lead = insertLead(db, { telegramUserId: "tg-booking-b5", telegramChatId: "chat-b5" });
    const request = insertRequest(db, { leadId: lead.id, telegramChatId: lead.telegram_chat_id });

    const row = insertBooking(db, {
      slotStart: "2026-07-14T17:00",
      slotEnd: "2026-07-14T18:00",
      status: "pending",
      requestId: request.id,
    });

    expect(row.request_id).toBe(request.id);

    db.close();
  });

  // @trace FR-HITL-02 — S1's own existing callers never pass requestId and
  // must keep compiling/passing unchanged.
  it("defaults request_id to null when omitted", () => {
    const db = openDatabase(":memory:");

    const row = insertBooking(db, {
      slotStart: "2026-07-06T10:00:00.000Z",
      slotEnd: "2026-07-06T11:00:00.000Z",
      status: "pending",
    });

    expect(row.request_id).toBeNull();

    db.close();
  });

  // @trace FR-HITL-02, design.md Decision 6 item 4 (the "Kyiv-offset
  // slot_start write contract" carryover): `insertBooking` must write the
  // caller's Kyiv wall-clock Slot string verbatim, never converting to UTC.
  it("round-trips a Kyiv wall-clock slot_start/slot_end with no trailing Z / numeric UTC offset", () => {
    const db = openDatabase(":memory:");

    const row = insertBooking(db, {
      slotStart: "2026-07-14T17:00",
      slotEnd: "2026-07-14T18:00",
      status: "pending",
    });

    expect(row.slot_start).toBe("2026-07-14T17:00");
    expect(row.slot_end).toBe("2026-07-14T18:00");
    expect(row.slot_start).not.toMatch(/Z$/);
    expect(row.slot_start).not.toMatch(/[+-]\d{2}:\d{2}$/);
    expect(row.slot_end).not.toMatch(/Z$/);
    expect(row.slot_end).not.toMatch(/[+-]\d{2}:\d{2}$/);

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
