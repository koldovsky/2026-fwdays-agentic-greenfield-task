import { describe, expect, it } from "vitest";
import { openDatabase } from "./index.ts";
import { insertLead, findLeadByTelegramUserId, deleteLeadCascade } from "./leads.ts";
import { insertRequest } from "./requests.ts";
import type Database from "better-sqlite3";

describe("insertLead (TC-DATA-01)", () => {
  // @trace FR-INTAKE-01
  it("persists a lead and returns it with id/created_at populated", () => {
    const db = openDatabase(":memory:");

    const row = insertLead(db, {
      telegramUserId: "tg-100",
      telegramChatId: "chat-100",
      telegramDisplayName: "Оксана",
    });

    expect(row.id).toBeGreaterThan(0);
    expect(row.telegram_user_id).toBe("tg-100");
    expect(row.telegram_chat_id).toBe("chat-100");
    expect(row.telegram_display_name).toBe("Оксана");
    expect(row.created_at).toBeTruthy();

    const fromDb = db.prepare("SELECT * FROM leads WHERE id = ?").get(row.id);
    expect(fromDb).toEqual(row);

    db.close();
  });

  it("defaults telegram_display_name to null when omitted", () => {
    const db = openDatabase(":memory:");

    const row = insertLead(db, {
      telegramUserId: "tg-101",
      telegramChatId: "chat-101",
    });

    expect(row.telegram_display_name).toBeNull();

    db.close();
  });

  it("rejects a duplicate telegram_user_id (same guard as raw SQL)", () => {
    const db = openDatabase(":memory:");

    insertLead(db, { telegramUserId: "tg-dup", telegramChatId: "chat-a" });

    expect(() => insertLead(db, { telegramUserId: "tg-dup", telegramChatId: "chat-b" })).toThrow(
      /UNIQUE constraint failed/,
    );

    db.close();
  });
});

describe("findLeadByTelegramUserId (TC-DATA-01)", () => {
  // @trace FR-INTAKE-08
  it("finds a previously-inserted lead by its telegram_user_id", () => {
    const db = openDatabase(":memory:");
    const inserted = insertLead(db, { telegramUserId: "tg-200", telegramChatId: "chat-200" });

    const found = findLeadByTelegramUserId(db, "tg-200");

    expect(found).toEqual(inserted);

    db.close();
  });

  it("returns undefined for an unknown telegram_user_id", () => {
    const db = openDatabase(":memory:");

    const found = findLeadByTelegramUserId(db, "does-not-exist");

    expect(found).toBeUndefined();

    db.close();
  });
});

/** Raw insert for a `bookings` row wired to `requestId` — no `@kamerton/db`
 *  helper exposes `request_id` yet (`insertBooking`'s `InsertBookingInput`
 *  predates S2's column; same test-only shortcut `packages/bot/src/
 *  pipeline.test.ts`'s `seedPendingBooking` uses). Returns the inserted
 *  row's autoincrement id. */
function seedBooking(
  db: Database.Database,
  requestId: number,
  status: "pending" | "confirmed" | "declined" | "cancelled",
  calendarEventId: string | null,
  slotStart: string,
): number {
  const slotEnd = slotStart.replace("T10:00", "T11:00").replace("T14:00", "T15:00");
  const result = db
    .prepare(
      `INSERT INTO bookings (slot_start, slot_end, status, calendar_event_id, request_id)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(slotStart, slotEnd, status, calendarEventId, requestId);
  return Number(result.lastInsertRowid);
}

function countRows(db: Database.Database, table: "leads" | "requests" | "bookings", column: string, value: number): number {
  const row = db.prepare(`SELECT COUNT(*) as n FROM ${table} WHERE ${column} = ?`).get(value) as {
    n: number;
  };
  return row.n;
}

// @trace NFR-PRIV-02
describe("deleteLeadCascade (NFR-PRIV-02)", () => {
  it("deletes a lead's leads/requests/bookings rows entirely, leaves an unrelated lead's rows intact, and returns exactly the pending bookings' calendar event ids", () => {
    const db = openDatabase(":memory:");

    // Lead A: two sibling `requests` rows (FR-INTAKE-08) — A1 carries a
    // `pending` booking with a real tentative calendar event; A2 carries an
    // unrelated `confirmed` booking (its own, different, calendar event id,
    // to prove the pending-only filter is on status, not merely "has an
    // event id").
    const leadA = insertLead(db, { telegramUserId: "tg-cascade-a", telegramChatId: "chat-a" });
    const requestA1 = insertRequest(db, { leadId: leadA.id, telegramChatId: "chat-a" });
    const requestA2 = insertRequest(db, { leadId: leadA.id, telegramChatId: "chat-a" });
    const pendingBookingId = seedBooking(
      db,
      requestA1.id,
      "pending",
      "evt-a-pending",
      "2026-07-06T10:00:00+03:00",
    );
    const confirmedBookingId = seedBooking(
      db,
      requestA2.id,
      "confirmed",
      "evt-a-confirmed",
      "2026-07-07T14:00:00+03:00",
    );

    // Lead B: unrelated lead with its own request + pending booking — proves
    // isolation (B's rows must survive A's deletion untouched, and B's
    // pending booking's event id must never leak into A's result).
    const leadB = insertLead(db, { telegramUserId: "tg-cascade-b", telegramChatId: "chat-b" });
    const requestB = insertRequest(db, { leadId: leadB.id, telegramChatId: "chat-b" });
    const bookingBId = seedBooking(
      db,
      requestB.id,
      "pending",
      "evt-b-pending",
      "2026-07-08T10:00:00+03:00",
    );

    const result = deleteLeadCascade(db, leadA.id);

    // A's rows are gone entirely — leads, requests, AND bookings (not just
    // requests via the schema's ON DELETE CASCADE, and not just an
    // ON-DELETE-SET-NULL orphaned bookings row — see the schema-correction
    // comment on deleteLeadCascade itself).
    expect(countRows(db, "leads", "id", leadA.id)).toBe(0);
    expect(countRows(db, "requests", "lead_id", leadA.id)).toBe(0);
    expect(db.prepare("SELECT * FROM bookings WHERE id = ?").get(pendingBookingId)).toBeUndefined();
    expect(db.prepare("SELECT * FROM bookings WHERE id = ?").get(confirmedBookingId)).toBeUndefined();

    // B's rows are completely intact (isolation).
    expect(countRows(db, "leads", "id", leadB.id)).toBe(1);
    expect(countRows(db, "requests", "lead_id", leadB.id)).toBe(1);
    const bookingBAfter = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingBId);
    expect(bookingBAfter).toBeDefined();

    // Exactly the ONE seeded pending booking's event id — not the confirmed
    // one, not B's.
    expect(result.deletedPendingEventIds).toEqual(["evt-a-pending"]);

    db.close();
  });
});
