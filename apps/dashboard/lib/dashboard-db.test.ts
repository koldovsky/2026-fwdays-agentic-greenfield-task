// Test-first (red): apps/dashboard/lib/dashboard-db.ts's
// `readDashboardSnapshot` is a typed throwing stub (dashboard tasks.md
// §5.5's red half) — every test below is expected to FAIL against the stub,
// for the right reason (the stub's synchronous throw), until §5.5's green
// half implements the real read. REAL `better-sqlite3` (`openDatabase(":memory:")`,
// design.md Decision 5) seeded via `@kamerton/db`'s own row helpers — same
// convention as `packages/bot/src/pipeline.test.ts`'s scaffolding.

import { describe, expect, it } from "vitest";
import {
  openDatabase,
  insertLead,
  insertMessage,
  insertRequest,
  updateRequestFields,
  updateRequestState,
} from "@kamerton/db";
import { readDashboardSnapshot } from "./dashboard-db.ts";

/** Raw insert for a `bookings` row wired to `requestId` via `request_id` —
 *  no `@kamerton/db` helper exposes that column yet (`insertBooking`'s
 *  `InsertBookingInput` predates it, `bookings.ts`'s own header comment);
 *  test-only, mirrors `packages/bot/src/pipeline.test.ts`'s
 *  `seedPendingBooking` helper. */
function seedBooking(
  db: ReturnType<typeof openDatabase>,
  requestId: number,
  status: "pending" | "confirmed",
  calendarEventId: string,
  slotStart: string,
  slotEnd: string,
): number {
  const result = db
    .prepare(
      `INSERT INTO bookings (slot_start, slot_end, status, calendar_event_id, request_id)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(slotStart, slotEnd, status, calendarEventId, requestId);
  return Number(result.lastInsertRowid);
}

const MONDAY_WEEK_START = "2026-07-06";

describe("readDashboardSnapshot (apps/dashboard/lib/dashboard-db.ts, dashboard tasks.md §5.5)", () => {
  // @trace FR-DASH-01
  // @trace FR-DASH-03
  it("a seeded pending request + booking appears in the queue with its brief, and a confirmed booking appears in the week's HallMap data", () => {
    const db = openDatabase(":memory:");

    const lead = insertLead(db, {
      telegramUserId: "tg-user-1",
      telegramChatId: "tg-chat-1",
      telegramDisplayName: "Тестова Лідка",
    });
    const pendingRequest = insertRequest(db, { leadId: lead.id, telegramChatId: "tg-chat-1" });
    updateRequestFields(db, pendingRequest.id, {
      studentName: "Оксана",
      studentAge: 9,
      format: "individual",
    });
    updateRequestState(db, pendingRequest.id, "awaiting_admin");
    seedBooking(
      db,
      pendingRequest.id,
      "pending",
      "cal-evt-pending",
      "2026-07-06T10:00:00+03:00",
      "2026-07-06T11:00:00+03:00",
    );

    const confirmedRequest = insertRequest(db, { leadId: lead.id, telegramChatId: "tg-chat-1" });
    updateRequestState(db, confirmedRequest.id, "done");
    seedBooking(
      db,
      confirmedRequest.id,
      "confirmed",
      "cal-evt-confirmed",
      "2026-07-07T14:00:00+03:00",
      "2026-07-07T15:00:00+03:00",
    );

    const snapshot = readDashboardSnapshot(db, MONDAY_WEEK_START);

    expect(snapshot.pendingQueue).toHaveLength(1);
    expect(snapshot.pendingQueue[0]!.requestId).toBe(pendingRequest.id);
    expect(snapshot.pendingQueue[0]!.brief).toContain("Оксана");

    const confirmedSeat = snapshot.hallMap.find((s) => s.weekday === 2 && s.hour === 14);
    expect(confirmedSeat).toBeDefined();
    expect(confirmedSeat!.status).toBe("confirmed");
  });

  // @trace FR-DASH-03
  it("an empty database produces an empty queue and an all-free week, without throwing", () => {
    const db = openDatabase(":memory:");

    const snapshot = readDashboardSnapshot(db, MONDAY_WEEK_START);

    expect(snapshot.pendingQueue).toHaveLength(0);
    expect(snapshot.hallMap.every((seat) => seat.status === "free")).toBe(true);
    expect(snapshot.conversationMessages).toEqual({});
  });

  // @trace FR-DASH-01 — the real `messages`-table read that makes the live
  // "Розмови" panel survive a page reload. Regression guard against the panel
  // going blank: the persisted transcript of an ACTIVE request must reach the
  // snapshot, keyed by its Telegram chat id, oldest-first.
  it("carries an active request's persisted transcript in conversationMessages, keyed by chat id", () => {
    const db = openDatabase(":memory:");

    const lead = insertLead(db, {
      telegramUserId: "tg-user-1",
      telegramChatId: "tg-chat-1",
      telegramDisplayName: "Тестова Лідка",
    });
    const activeRequest = insertRequest(db, { leadId: lead.id, telegramChatId: "tg-chat-1" });
    updateRequestState(db, activeRequest.id, "collecting");
    insertMessage(db, { requestId: activeRequest.id, role: "user", content: "Хочу записати доньку" });
    insertMessage(db, { requestId: activeRequest.id, role: "assistant", content: "Радо! Як звати дитину?" });

    const snapshot = readDashboardSnapshot(db, MONDAY_WEEK_START);

    expect(snapshot.conversationMessages["tg-chat-1"]).toEqual([
      { role: "user", content: "Хочу записати доньку" },
      { role: "assistant", content: "Радо! Як звати дитину?" },
    ]);
  });

  // @trace FR-DASH-01 / FR-DASH-03 — a confirmed booking surfaces both in the
  // confirmed-bookings list (with student + slot times) and as the seat's
  // named occupant for the HallMap hover tooltip.
  it("a confirmed booking appears in confirmedBookings and names the HallMap seat's occupant", () => {
    const db = openDatabase(":memory:");

    const lead = insertLead(db, {
      telegramUserId: "tg-user-1",
      telegramChatId: "tg-chat-1",
      telegramDisplayName: "Тестова Лідка",
    });
    const req = insertRequest(db, { leadId: lead.id, telegramChatId: "tg-chat-1" });
    updateRequestFields(db, req.id, { studentName: "Соломія", studentAge: 12 });
    updateRequestState(db, req.id, "awaiting_admin");
    seedBooking(db, req.id, "confirmed", "cal-evt-confirmed", "2026-07-07T14:00", "2026-07-07T15:00");

    const snapshot = readDashboardSnapshot(db, MONDAY_WEEK_START);

    expect(snapshot.confirmedBookings).toEqual([
      {
        requestId: req.id,
        studentName: "Соломія",
        studentAge: 12,
        slotStart: "2026-07-07T14:00",
        slotEnd: "2026-07-07T15:00",
      },
    ]);

    const seat = snapshot.hallMap.find((s) => s.weekday === 2 && s.hour === 14)!;
    expect(seat.status).toBe("confirmed");
    expect(seat.occupantName).toBe("Соломія");
  });
});
