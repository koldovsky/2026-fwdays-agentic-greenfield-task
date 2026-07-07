import { describe, expect, it } from "vitest";
import { openDatabase } from "./index.ts";
import { insertBooking } from "./bookings.ts";
import { insertLead } from "./leads.ts";
import { insertRequest } from "./requests.ts";

describe("bookings schema (TC-DATA-01)", () => {
  it("creates the bookings table on init", () => {
    const db = openDatabase(":memory:");
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'bookings'")
      .all();
    expect(tables).toHaveLength(1);
    db.close();
  });

  // @trace FR-SLOT-02
  it("persists a pending hold and reads it back", () => {
    const db = openDatabase(":memory:");

    const insert = db
      .prepare(
        `INSERT INTO bookings (slot_start, slot_end, status, calendar_event_id)
         VALUES (@slot_start, @slot_end, @status, @calendar_event_id)`,
      )
      .run({
        slot_start: "2026-07-06T10:00:00+03:00",
        slot_end: "2026-07-06T11:00:00+03:00",
        status: "pending",
        calendar_event_id: "fake-event-id-1",
      });

    const row = db
      .prepare("SELECT * FROM bookings WHERE id = ?")
      .get(insert.lastInsertRowid) as {
      id: number;
      slot_start: string;
      slot_end: string;
      status: string;
      calendar_event_id: string | null;
      created_at: string;
    };

    expect(row).toBeDefined();
    expect(row.slot_start).toBe("2026-07-06T10:00:00+03:00");
    expect(row.slot_end).toBe("2026-07-06T11:00:00+03:00");
    expect(row.status).toBe("pending");
    expect(row.calendar_event_id).toBe("fake-event-id-1");
    expect(row.created_at).toBeTruthy();

    db.close();
  });

  // @trace FR-SLOT-02 — DB-level backstop for the hold TOCTOU window
  // (review-gate S1 finding): if two concurrent holds both pass the
  // calendar-side freeBusy re-check, the second pending row is rejected.
  it("rejects a second pending row for the same slot (partial unique index)", () => {
    const db = openDatabase(":memory:");
    const insert = db.prepare(
      `INSERT INTO bookings (slot_start, slot_end, status) VALUES (?, ?, ?)`,
    );
    insert.run("2026-07-06T12:00:00+03:00", "2026-07-06T13:00:00+03:00", "pending");
    expect(() =>
      insert.run("2026-07-06T12:00:00+03:00", "2026-07-06T13:00:00+03:00", "pending"),
    ).toThrow(/UNIQUE constraint failed/);
    // a terminal row for the same slot is fine (the index is partial):
    insert.run("2026-07-06T12:00:00+03:00", "2026-07-06T13:00:00+03:00", "cancelled");
    db.close();
  });

  it("rejects a bogus status via the CHECK constraint", () => {
    const db = openDatabase(":memory:");

    expect(() =>
      db
        .prepare(
          `INSERT INTO bookings (slot_start, slot_end, status)
           VALUES (?, ?, ?)`,
        )
        .run("2026-07-06T10:00:00+03:00", "2026-07-06T11:00:00+03:00", "bogus"),
    ).toThrow(/CHECK constraint failed/);

    db.close();
  });
});

// --- S4 booking-hitl Stage B (RED): notifications outbox +
// requests.offered_slots (tasks.md B.1, design.md Decision 1 / Decision 4
// items 1-2). schema.ts is deliberately NOT touched yet — every case below
// must fail against the current schema (no `notifications` table, no
// `offered_slots` column) for the right reason, then go green once B.2
// lands.

describe("notifications schema (booking-hitl design.md Decision 1 / Decision 4 item 1)", () => {
  // @trace FR-HITL-02
  it("creates the notifications table on init", () => {
    const db = openDatabase(":memory:");
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'notifications'")
      .all();
    expect(tables).toHaveLength(1);
    db.close();
  });

  // @trace FR-HITL-02
  it("rejects a bogus delivery_status via the CHECK constraint", () => {
    const db = openDatabase(":memory:");
    const booking = insertBooking(db, {
      slotStart: "2026-07-14T17:00",
      slotEnd: "2026-07-14T18:00",
      status: "pending",
    });

    expect(() =>
      db
        .prepare(
          `INSERT INTO notifications (booking_id, telegram_chat_id, kind, payload, delivery_status)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(booking.id, "chat-1", "confirmed", JSON.stringify({ text: "x" }), "bogus"),
    ).toThrow(/CHECK constraint failed/);

    db.close();
  });

  // @trace FR-HITL-02
  it("rejects a bogus kind via the CHECK constraint", () => {
    const db = openDatabase(":memory:");
    const booking = insertBooking(db, {
      slotStart: "2026-07-14T17:00",
      slotEnd: "2026-07-14T18:00",
      status: "pending",
    });

    expect(() =>
      db
        .prepare(
          `INSERT INTO notifications (booking_id, telegram_chat_id, kind, payload)
           VALUES (?, ?, ?, ?)`,
        )
        .run(booking.id, "chat-1", "bogus-kind", JSON.stringify({ text: "x" })),
    ).toThrow(/CHECK constraint failed/);

    db.close();
  });
});

describe("requests.offered_slots column (booking-hitl design.md Decision 4 item 2)", () => {
  // @trace FR-HITL-02
  it("adds an offered_slots column to requests, nullable", () => {
    const db = openDatabase(":memory:");
    const columns = db.prepare("PRAGMA table_info(requests)").all() as Array<{
      name: string;
      notnull: number;
    }>;
    const offeredSlots = columns.find((c) => c.name === "offered_slots");
    expect(offeredSlots).toBeDefined();
    expect(offeredSlots?.notnull).toBe(0);
    db.close();
  });
});

// --- S5 kb-learning Stage A (RED): `questions` table (tasks.md A.1,
// design.md Decision 4). schema.ts is deliberately NOT touched yet — every
// case below must fail against the current schema (no `questions` table)
// for the right reason, then go green once A.2 lands.

describe("questions schema (kb-learning design.md Decision 4)", () => {
  function seedLeadAndRequest(db: ReturnType<typeof openDatabase>) {
    const lead = insertLead(db, {
      telegramUserId: "tg-kb-1",
      telegramChatId: "chat-kb-1",
    });
    const request = insertRequest(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
    });
    return { lead, request };
  }

  // @trace FR-KB-01
  it("creates the questions table on init", () => {
    const db = openDatabase(":memory:");
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'questions'")
      .all();
    expect(tables).toHaveLength(1);
    db.close();
  });

  // @trace FR-KB-01
  it("rejects a bogus answer_source via the CHECK constraint", () => {
    const db = openDatabase(":memory:");
    const { lead } = seedLeadAndRequest(db);

    expect(() =>
      db
        .prepare(
          `INSERT INTO questions (lead_id, telegram_chat_id, text, answer_source)
           VALUES (?, ?, ?, ?)`,
        )
        .run(lead.id, lead.telegram_chat_id, "Скільки коштує заняття?", "bogus"),
    ).toThrow(/CHECK constraint failed/);

    db.close();
  });

  // @trace FR-KB-01
  it("rejects a bogus status via the CHECK constraint", () => {
    const db = openDatabase(":memory:");
    const { lead } = seedLeadAndRequest(db);

    expect(() =>
      db
        .prepare(
          `INSERT INTO questions (lead_id, telegram_chat_id, text, answer_source, status)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(lead.id, lead.telegram_chat_id, "Скільки коштує заняття?", "unanswered", "bogus"),
    ).toThrow(/CHECK constraint failed/);

    db.close();
  });

  // @trace FR-KB-01
  it("rejects a bogus delivery_status via the CHECK constraint", () => {
    const db = openDatabase(":memory:");
    const { lead } = seedLeadAndRequest(db);

    expect(() =>
      db
        .prepare(
          `INSERT INTO questions (lead_id, telegram_chat_id, text, answer_source, delivery_status)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(lead.id, lead.telegram_chat_id, "Скільки коштує заняття?", "unanswered", "bogus"),
    ).toThrow(/CHECK constraint failed/);

    db.close();
  });

  // @trace FR-KB-01
  it("rejects a row with a non-existent lead_id (FK enforced)", () => {
    const db = openDatabase(":memory:");

    expect(() =>
      db
        .prepare(
          `INSERT INTO questions (lead_id, telegram_chat_id, text, answer_source)
           VALUES (?, ?, ?, ?)`,
        )
        .run(999999, "chat-kb-nope", "Скільки коштує заняття?", "unanswered"),
    ).toThrow(/FOREIGN KEY constraint failed/);

    db.close();
  });

  // @trace FR-KB-01
  it("cascades: deleting a leads row deletes its questions rows", () => {
    const db = openDatabase(":memory:");
    const { lead } = seedLeadAndRequest(db);

    const insert = db
      .prepare(
        `INSERT INTO questions (lead_id, telegram_chat_id, text, answer_source)
         VALUES (?, ?, ?, ?)`,
      )
      .run(lead.id, lead.telegram_chat_id, "Скільки коштує заняття?", "unanswered");

    db.prepare("DELETE FROM leads WHERE id = ?").run(lead.id);

    const row = db.prepare("SELECT * FROM questions WHERE id = ?").get(insert.lastInsertRowid);
    expect(row).toBeUndefined();

    db.close();
  });

  // @trace FR-KB-01
  it("deleting a requests row sets the surviving questions.request_id to NULL, never deletes the row", () => {
    const db = openDatabase(":memory:");
    const { lead, request } = seedLeadAndRequest(db);

    const insert = db
      .prepare(
        `INSERT INTO questions (lead_id, request_id, telegram_chat_id, text, answer_source)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(lead.id, request.id, lead.telegram_chat_id, "Скільки коштує заняття?", "unanswered");

    db.prepare("DELETE FROM requests WHERE id = ?").run(request.id);

    const row = db.prepare("SELECT * FROM questions WHERE id = ?").get(insert.lastInsertRowid) as {
      id: number;
      request_id: number | null;
    };
    expect(row).toBeDefined();
    expect(row.request_id).toBeNull();

    db.close();
  });
});
