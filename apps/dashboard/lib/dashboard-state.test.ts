// Test-first (red): apps/dashboard/lib/dashboard-state.ts's
// `buildStateSnapshot` is a typed throwing stub (dashboard tasks.md §5.2's
// red half) — every test below is expected to FAIL against the stub, for
// the right reason (the stub's synchronous throw), until §5.2's green half
// implements the real pure assembly. Plain fixture arrays only — no
// `better-sqlite3` here at all (that is §5.5's `dashboard-db.test.ts`'s job);
// this suite proves `buildStateSnapshot` is testable with zero I/O.

import { describe, expect, it } from "vitest";
import type { LeadRow, RequestRow } from "@kamerton/db";
import { buildStateSnapshot, type DashboardBookingRow } from "./dashboard-state.ts";

function lead(overrides: Partial<LeadRow> = {}): LeadRow {
  return {
    id: 1,
    telegram_user_id: "tg-user-1",
    telegram_chat_id: "tg-chat-1",
    telegram_display_name: "Тестова Лідка",
    created_at: "2026-07-06T10:00:00.000Z",
    ...overrides,
  };
}

function request(overrides: Partial<RequestRow> = {}): RequestRow {
  return {
    id: 1,
    lead_id: 1,
    telegram_chat_id: "tg-chat-1",
    state: "awaiting_admin",
    student_name: null,
    student_age: null,
    format: null,
    goal_tag: null,
    goal_text: null,
    tastes: null,
    dream_song: null,
    experience: null,
    comfort: null,
    preferred_weekdays: null,
    preferred_time_range: null,
    created_at: "2026-07-06T10:00:00.000Z",
    offered_slots: null,
    ...overrides,
  };
}

function booking(overrides: Partial<DashboardBookingRow> = {}): DashboardBookingRow {
  return {
    id: 1,
    slot_start: "2026-07-06T10:00:00+03:00",
    slot_end: "2026-07-06T11:00:00+03:00",
    status: "pending",
    calendar_event_id: "cal-evt-1",
    request_id: 1,
    created_at: "2026-07-06T09:00:00.000Z",
    ...overrides,
  };
}

const MONDAY_WEEK_START = "2026-07-06"; // a Monday (this suite's own fixture week)

describe("buildStateSnapshot (apps/dashboard/lib/dashboard-state.ts, dashboard tasks.md §5.2)", () => {
  // @trace FR-DASH-01
  it("a pending request appears in the queue with its compiled first-lesson brief", () => {
    const state = buildStateSnapshot(
      {
        leads: [lead()],
        requests: [
          request({
            id: 1,
            student_name: "Оксана",
            student_age: 9,
            format: "individual",
            goal_tag: "hobby",
            goal_text: "для задоволення",
          }),
        ],
        bookings: [booking({ request_id: 1, status: "pending" })],
      },
      MONDAY_WEEK_START,
    );

    expect(state.pendingQueue).toHaveLength(1);
    const entry = state.pendingQueue[0]!;
    expect(entry.requestId).toBe(1);
    expect(entry.studentName).toBe("Оксана");
    expect(entry.brief).toContain("Оксана");
    expect(entry.brief).toContain("Формат:");
  });

  // @trace FR-DASH-03
  it("a seat with a confirmed AND a pending booking this week resolves to 'confirmed' via hallSeatStatus's precedence", () => {
    const state = buildStateSnapshot(
      {
        leads: [lead()],
        requests: [request({ id: 1 }), request({ id: 2, lead_id: 1 })],
        bookings: [
          booking({ id: 1, request_id: 1, status: "pending", slot_start: "2026-07-06T10:00:00+03:00" }),
          booking({ id: 2, request_id: 2, status: "confirmed", slot_start: "2026-07-06T10:00:00+03:00" }),
        ],
      },
      MONDAY_WEEK_START,
    );

    const seat = state.hallMap.find((s) => s.weekday === 1 && s.hour === 10);
    expect(seat).toBeDefined();
    expect(seat!.status).toBe("confirmed");
  });

  // @trace FR-DASH-03
  it("empty rows produce an empty queue and an all-free week, without throwing", () => {
    const state = buildStateSnapshot({ leads: [], requests: [], bookings: [] }, MONDAY_WEEK_START);

    expect(state.pendingQueue).toHaveLength(0);
    expect(state.hallMap.length).toBeGreaterThan(0); // the grid itself is always present
    expect(state.hallMap.every((seat) => seat.status === "free")).toBe(true);
  });
});
