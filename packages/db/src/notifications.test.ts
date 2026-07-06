// booking-hitl tasks.md B.3 (RED): notification outbox row helpers
// (design.md Decision 1 / Decision 4 item 1). Real in-memory SQLite, same
// discipline as bookings.test.ts/requests.test.ts — every case below throws
// at the first `insertNotification`/etc. call today (notifications.ts is a
// typed throwing stub), which is the correct RED reason: the feature does
// not exist yet, not a false negative.

import { describe, expect, it } from "vitest";
import { openDatabase } from "./index.ts";
import { insertBooking } from "./bookings.ts";
import {
  insertNotification,
  findDeliverableNotifications,
  markNotificationDelivered,
  markNotificationFailed,
} from "./notifications.ts";

function seedBooking(db: ReturnType<typeof openDatabase>) {
  return insertBooking(db, {
    slotStart: "2026-07-14T17:00",
    slotEnd: "2026-07-14T18:00",
    status: "pending",
    calendarEventId: "evt-notify-1",
  });
}

describe("insertNotification (booking-hitl design.md Decision 1 / Decision 4 item 1)", () => {
  // @trace FR-HITL-02
  it("persists and round-trips every column", () => {
    const db = openDatabase(":memory:");
    const booking = seedBooking(db);
    const payload = JSON.stringify({ text: "Заняття підтверджено 🎵" });

    const row = insertNotification(db, {
      bookingId: booking.id,
      telegramChatId: "chat-42",
      kind: "confirmed",
      payload,
    });

    expect(row.id).toBeGreaterThan(0);
    expect(row.booking_id).toBe(booking.id);
    expect(row.telegram_chat_id).toBe("chat-42");
    expect(row.kind).toBe("confirmed");
    expect(row.payload).toBe(payload);
    expect(row.delivery_status).toBe("pending");
    expect(row.created_at).toBeTruthy();
    expect(row.delivered_at).toBeNull();

    const fromDb = db.prepare("SELECT * FROM notifications WHERE id = ?").get(row.id);
    expect(fromDb).toEqual(row);

    db.close();
  });
});

describe("findDeliverableNotifications", () => {
  // @trace FR-HITL-02, @trace NFR-REL-01
  it("returns only pending/failed rows ordered by id, respecting limit", () => {
    const db = openDatabase(":memory:");
    const booking = seedBooking(db);

    const a = insertNotification(db, {
      bookingId: booking.id,
      telegramChatId: "chat-1",
      kind: "confirmed",
      payload: "{}",
    });
    const b = insertNotification(db, {
      bookingId: booking.id,
      telegramChatId: "chat-1",
      kind: "declined",
      payload: "{}",
    });
    const c = insertNotification(db, {
      bookingId: booking.id,
      telegramChatId: "chat-1",
      kind: "proposed_again",
      payload: "{}",
    });

    // b is already delivered — never a candidate again.
    markNotificationDelivered(db, b.id);

    const deliverable = findDeliverableNotifications(db, 10);
    expect(deliverable.map((n) => n.id)).toEqual([a.id, c.id]);

    const limited = findDeliverableNotifications(db, 1);
    expect(limited.map((n) => n.id)).toEqual([a.id]);

    db.close();
  });
});

describe("markNotificationDelivered / markNotificationFailed", () => {
  // @trace FR-HITL-02, @trace NFR-REL-01
  it("flips exactly one row to delivered, stamping delivered_at, siblings untouched", () => {
    const db = openDatabase(":memory:");
    const booking = seedBooking(db);
    const a = insertNotification(db, {
      bookingId: booking.id,
      telegramChatId: "chat-1",
      kind: "confirmed",
      payload: "{}",
    });
    const b = insertNotification(db, {
      bookingId: booking.id,
      telegramChatId: "chat-1",
      kind: "confirmed",
      payload: "{}",
    });

    const changed = markNotificationDelivered(db, a.id);
    expect(changed).toBe(1);

    const rowA = db.prepare("SELECT * FROM notifications WHERE id = ?").get(a.id) as {
      delivery_status: string;
      delivered_at: string | null;
    };
    expect(rowA.delivery_status).toBe("delivered");
    expect(rowA.delivered_at).toBeTruthy();

    const rowB = db.prepare("SELECT * FROM notifications WHERE id = ?").get(b.id) as {
      delivery_status: string;
    };
    expect(rowB.delivery_status).toBe("pending");

    db.close();
  });

  // @trace FR-HITL-02, @trace NFR-REL-01
  it("flips exactly one row to failed, siblings untouched", () => {
    const db = openDatabase(":memory:");
    const booking = seedBooking(db);
    const a = insertNotification(db, {
      bookingId: booking.id,
      telegramChatId: "chat-1",
      kind: "confirmed",
      payload: "{}",
    });
    const b = insertNotification(db, {
      bookingId: booking.id,
      telegramChatId: "chat-1",
      kind: "confirmed",
      payload: "{}",
    });

    const changed = markNotificationFailed(db, a.id);
    expect(changed).toBe(1);

    const rowA = db.prepare("SELECT * FROM notifications WHERE id = ?").get(a.id) as {
      delivery_status: string;
    };
    expect(rowA.delivery_status).toBe("failed");

    const rowB = db.prepare("SELECT * FROM notifications WHERE id = ?").get(b.id) as {
      delivery_status: string;
    };
    expect(rowB.delivery_status).toBe("pending");

    db.close();
  });

  it("returns 0 changes for a nonexistent id, without throwing", () => {
    const db = openDatabase(":memory:");
    expect(markNotificationDelivered(db, 999999)).toBe(0);
    expect(markNotificationFailed(db, 999999)).toBe(0);
    db.close();
  });
});
