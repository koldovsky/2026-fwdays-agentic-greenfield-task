// booking-hitl tasks.md B.7 (RED): `findBookingsByRequestId` (design.md
// Decision 4 item 4) — replaces `packages/bot/src/pipeline.ts`'s inline raw
// SQL with a shared, tested helper. `findBookingsByRequestId` is a typed
// throwing stub in bookings.ts until B.8, so every case below throws at the
// first call — the correct RED reason (the helper does not exist yet), not
// a false negative.

import { describe, expect, it } from "vitest";
import { openDatabase } from "./index.ts";
import { insertLead } from "./leads.ts";
import { insertRequest } from "./requests.ts";
import { findBookingsByRequestId } from "./bookings.ts";

function seedRequest(db: ReturnType<typeof openDatabase>, telegramUserId: string) {
  const lead = insertLead(db, { telegramUserId, telegramChatId: `chat-${telegramUserId}` });
  return insertRequest(db, { leadId: lead.id, telegramChatId: lead.telegram_chat_id });
}

// Raw SQL insert, not `insertBooking` — B.5/B.6 have not wired `request_id`
// into `insertBooking` yet, so fixtures set it directly (same "exercise a
// not-yet-wired column via raw SQL" precedent as leads-requests.test.ts).
function seedBookingForRequest(
  db: ReturnType<typeof openDatabase>,
  requestId: number,
  slotStart: string,
  slotEnd: string,
) {
  return db
    .prepare(
      `INSERT INTO bookings (slot_start, slot_end, status, request_id)
       VALUES (?, ?, ?, ?) RETURNING *`,
    )
    .get(slotStart, slotEnd, "pending", requestId) as { id: number };
}

describe("findBookingsByRequestId (booking-hitl design.md Decision 4 item 4)", () => {
  // @trace FR-HITL-02
  it("returns every booking for the request, newest first", () => {
    const db = openDatabase(":memory:");
    const request = seedRequest(db, "tg-find-by-request-1");
    const first = seedBookingForRequest(db, request.id, "2026-07-14T17:00", "2026-07-14T18:00");
    const second = seedBookingForRequest(db, request.id, "2026-07-15T10:00", "2026-07-15T11:00");

    const rows = findBookingsByRequestId(db, request.id);

    expect(rows.map((r) => r.id)).toEqual([second.id, first.id]);

    db.close();
  });

  // @trace FR-HITL-02
  it("returns [] for a request with no bookings", () => {
    const db = openDatabase(":memory:");
    const request = seedRequest(db, "tg-find-by-request-2");

    const rows = findBookingsByRequestId(db, request.id);

    expect(rows).toEqual([]);

    db.close();
  });
});
