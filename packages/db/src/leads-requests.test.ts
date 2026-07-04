// @kamerton/db — schema tests for `leads`/`requests` (S2 `intake`,
// design.md Decision 4) plus the `bookings.request_id` follow-up column S1
// deferred to this slice. Same discipline as schema.test.ts: real
// `:memory:` SQLite via `openDatabase()`, no mocking of better-sqlite3.

import { describe, expect, it } from "vitest";
import { openDatabase } from "./index.ts";

describe("leads/requests schema (TC-DATA-01, design.md Decision 4)", () => {
  it("creates the leads and requests tables on init", () => {
    const db = openDatabase(":memory:");
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('leads', 'requests')",
      )
      .all();
    expect(tables).toHaveLength(2);
    db.close();
  });

  it("creates idx_requests_lead_id", () => {
    const db = openDatabase(":memory:");
    const indexes = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_requests_lead_id'",
      )
      .all();
    expect(indexes).toHaveLength(1);
    db.close();
  });

  // @trace NFR-PRIV-02 (schema half — S1's deferred column)
  it("adds a request_id column to bookings, nullable and referencing requests", () => {
    const db = openDatabase(":memory:");
    const columns = db.prepare("PRAGMA table_info(bookings)").all() as Array<{
      name: string;
      notnull: number;
    }>;
    const requestId = columns.find((c) => c.name === "request_id");
    expect(requestId).toBeDefined();
    expect(requestId?.notnull).toBe(0);

    const foreignKeys = db.prepare("PRAGMA foreign_key_list(bookings)").all() as Array<{
      table: string;
      from: string;
      to: string;
      on_delete: string;
    }>;
    const fk = foreignKeys.find((f) => f.from === "request_id");
    expect(fk).toBeDefined();
    expect(fk?.table).toBe("requests");
    expect(fk?.on_delete).toBe("SET NULL");

    db.close();
  });

  it("is safe to call initSchema-equivalent (openDatabase) twice without error", () => {
    // Idempotency check for the bookings.request_id ALTER TABLE (SQLite has
    // no ADD COLUMN IF NOT EXISTS grammar — see schema.ts comment); a second
    // openDatabase() against the same file must not throw "duplicate column".
    const path = ":memory:";
    const db1 = openDatabase(path);
    db1.close();
    expect(() => {
      const db2 = openDatabase(path);
      db2.close();
    }).not.toThrow();
  });

  it("enables the foreign_keys pragma so ON DELETE CASCADE/SET NULL fire", () => {
    const db = openDatabase(":memory:");
    const result = db.pragma("foreign_keys") as Array<{ foreign_keys: number }>;
    expect(result[0]?.foreign_keys).toBe(1);
    db.close();
  });

  it("rejects a duplicate telegram_user_id via the UNIQUE constraint", () => {
    const db = openDatabase(":memory:");
    const insert = db.prepare(
      `INSERT INTO leads (telegram_user_id, telegram_chat_id, telegram_display_name)
       VALUES (?, ?, ?)`,
    );
    insert.run("tg-1", "chat-1", "Оксана");
    expect(() => insert.run("tg-1", "chat-2", "Хтось інший")).toThrow(/UNIQUE constraint failed/);
    db.close();
  });

  it("rejects a bogus requests.state via the CHECK constraint", () => {
    const db = openDatabase(":memory:");
    const lead = db
      .prepare(`INSERT INTO leads (telegram_user_id, telegram_chat_id) VALUES (?, ?) RETURNING *`)
      .get("tg-2", "chat-2") as { id: number };

    expect(() =>
      db
        .prepare(
          `INSERT INTO requests (lead_id, telegram_chat_id, state) VALUES (?, ?, ?)`,
        )
        .run(lead.id, "chat-2", "bogus"),
    ).toThrow(/CHECK constraint failed/);

    db.close();
  });

  it("rejects a bogus requests.format via the CHECK constraint", () => {
    const db = openDatabase(":memory:");
    const lead = db
      .prepare(`INSERT INTO leads (telegram_user_id, telegram_chat_id) VALUES (?, ?) RETURNING *`)
      .get("tg-3", "chat-3") as { id: number };

    expect(() =>
      db
        .prepare(
          `INSERT INTO requests (lead_id, telegram_chat_id, format) VALUES (?, ?, ?)`,
        )
        .run(lead.id, "chat-3", "instrument"),
    ).toThrow(/CHECK constraint failed/);

    db.close();
  });

  it("rejects a bogus requests.goal_tag via the CHECK constraint", () => {
    const db = openDatabase(":memory:");
    const lead = db
      .prepare(`INSERT INTO leads (telegram_user_id, telegram_chat_id) VALUES (?, ?) RETURNING *`)
      .get("tg-4", "chat-4") as { id: number };

    expect(() =>
      db
        .prepare(
          `INSERT INTO requests (lead_id, telegram_chat_id, goal_tag) VALUES (?, ?, ?)`,
        )
        .run(lead.id, "chat-4", "bogus-goal"),
    ).toThrow(/CHECK constraint failed/);

    db.close();
  });

  // @trace NFR-PRIV-02
  it("cascades a leads delete to its requests rows", () => {
    const db = openDatabase(":memory:");
    const lead = db
      .prepare(`INSERT INTO leads (telegram_user_id, telegram_chat_id) VALUES (?, ?) RETURNING *`)
      .get("tg-5", "chat-5") as { id: number };
    const request = db
      .prepare(
        `INSERT INTO requests (lead_id, telegram_chat_id) VALUES (?, ?) RETURNING *`,
      )
      .get(lead.id, "chat-5") as { id: number };

    db.prepare("DELETE FROM leads WHERE id = ?").run(lead.id);

    const remainingRequest = db.prepare("SELECT * FROM requests WHERE id = ?").get(request.id);
    expect(remainingRequest).toBeUndefined();

    db.close();
  });

  // @trace NFR-PRIV-02 — bookings.request_id is `ON DELETE SET NULL`
  // (design.md Decision 4), not CASCADE: a booking is calendar-linked audit
  // evidence that outlives the request that spawned it; the *full* lead
  // erasure (deleting the booking row itself too) is the dashboard's
  // delete-lead admin action (S3), a multi-statement application operation,
  // not a DB-level cascade. This test proves the schema-level half: the
  // deletion event reaches the bookings row (its `request_id` link is
  // severed) rather than leaving a dangling foreign key.
  it("cascades a leads delete to its bookings rows by nulling request_id", () => {
    const db = openDatabase(":memory:");
    const lead = db
      .prepare(`INSERT INTO leads (telegram_user_id, telegram_chat_id) VALUES (?, ?) RETURNING *`)
      .get("tg-6", "chat-6") as { id: number };
    const request = db
      .prepare(
        `INSERT INTO requests (lead_id, telegram_chat_id) VALUES (?, ?) RETURNING *`,
      )
      .get(lead.id, "chat-6") as { id: number };
    const booking = db
      .prepare(
        `INSERT INTO bookings (slot_start, slot_end, status, request_id)
         VALUES (?, ?, ?, ?) RETURNING *`,
      )
      .get("2026-07-06T10:00:00+03:00", "2026-07-06T11:00:00+03:00", "pending", request.id) as {
      id: number;
    };

    db.prepare("DELETE FROM leads WHERE id = ?").run(lead.id);

    const bookingAfter = db.prepare("SELECT * FROM bookings WHERE id = ?").get(booking.id) as {
      id: number;
      request_id: number | null;
    };
    expect(bookingAfter).toBeDefined();
    expect(bookingAfter.request_id).toBeNull();

    db.close();
  });
});
