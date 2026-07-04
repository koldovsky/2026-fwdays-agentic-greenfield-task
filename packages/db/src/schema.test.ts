import { describe, expect, it } from "vitest";
import { openDatabase } from "./index.ts";

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
