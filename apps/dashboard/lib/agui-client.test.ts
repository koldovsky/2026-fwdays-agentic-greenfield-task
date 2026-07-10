// Test-first (red): apps/dashboard/lib/agui-client.ts's `safeParseAguiEvent`/
// `applyAguiEvent`/`connectAgui` are typed throwing stubs (dashboard
// tasks.md §6.2's red half) — every test below is expected to FAIL against
// the stub, for the right reason (the stub's synchronous throw propagating
// out of a direct call), until the green half implements the real client.
// Plain Node environment (no DOM needed for the reducer/parse tests;
// `connectAgui`'s own test installs a fake `EventSource` global directly,
// so this file does NOT need `// @vitest-environment jsdom`).

import { describe, expect, it } from "vitest";
import type { AguiEvent } from "@kamerton/lib/src/agui/events.ts";
import {
  applyAguiEvent,
  connectAgui,
  EMPTY_REQUEST_CARD_FIELDS,
  initialDashboardClientState,
  safeParseAguiEvent,
  seedConversationsFromActiveRequests,
  type BookingPendingPayload,
  type DashboardClientState,
} from "./agui-client.ts";
import type { DashboardState } from "./dashboard-state.ts";

describe("safeParseAguiEvent (dashboard tasks.md §6.2)", () => {
  // @trace TC-PROTO-01
  it("returns null, never throws, for non-JSON data", () => {
    expect(() => safeParseAguiEvent("not json at all {{{")).not.toThrow();
    expect(safeParseAguiEvent("not json at all {{{")).toBeNull();
  });

  // @trace TC-PROTO-01
  it("returns null for a recognized-shape-but-unknown event type", () => {
    const payload = JSON.stringify({ type: "TOOL_CALL_START", threadId: "tg-chat-1" });
    expect(safeParseAguiEvent(payload)).toBeNull();
  });

  it("parses a well-formed RUN_STARTED event", () => {
    const event: AguiEvent = { type: "RUN_STARTED", threadId: "tg-chat-1", runId: "run-1" };
    expect(safeParseAguiEvent(JSON.stringify(event))).toEqual(event);
  });

  it("returns null for a JSON payload that is not an object", () => {
    expect(safeParseAguiEvent("42")).toBeNull();
    expect(safeParseAguiEvent('"just a string"')).toBeNull();
    expect(safeParseAguiEvent("null")).toBeNull();
  });
});

function emptyDashboard(): DashboardState {
  return { activeRequests: [], pendingQueue: [], hallMap: [], conversationMessages: {}, confirmedBookings: [] };
}

function stateWithActiveRequest(requestId: number, threadId: string): DashboardClientState {
  return {
    ...initialDashboardClientState,
    dashboard: {
      ...emptyDashboard(),
      activeRequests: [
        {
          id: requestId,
          lead_id: 1,
          telegram_chat_id: threadId,
          state: "collecting",
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
        },
      ],
    },
  };
}

describe("applyAguiEvent — STATE_SNAPSHOT (dashboard tasks.md §6.2)", () => {
  // @trace TC-PROTO-01
  it("threadId 'dashboard' replaces the whole dashboard snapshot wholesale", () => {
    const before = stateWithActiveRequest(1, "tg-chat-1");
    const nextSnapshot: DashboardState = {
      ...emptyDashboard(),
      pendingQueue: [
        {
          requestId: 2,
          leadId: 2,
          telegramChatId: "tg-chat-2",
          studentName: "Іван",
          studentAge: 8,
          brief: "brief text",
          bookingId: 5,
          calendarEventId: null,
          slotStart: "2026-07-06T10:00:00",
          slotEnd: "2026-07-06T11:00:00",
        },
      ],
    };
    const event: AguiEvent = { type: "STATE_SNAPSHOT", threadId: "dashboard", snapshot: nextSnapshot };

    const after = applyAguiEvent(before, event);

    expect(after.dashboard).toEqual(nextSnapshot);
    expect(after.dashboard).not.toEqual(before.dashboard);
  });

  it("a per-thread STATE_SNAPSHOT replaces that thread's request card wholesale", () => {
    const before: DashboardClientState = {
      ...initialDashboardClientState,
      requestCards: {
        "tg-chat-1": { studentName: "Стара", studentAge: 6, format: null, goalTag: null, goalText: null, tastes: null, dreamSong: null, experience: null, comfort: null, preferredWeekdays: null, preferredTimeRange: null },
      },
    };
    const snapshot = { studentName: "Оксана" }; // deliberately missing other fields
    const event: AguiEvent = { type: "STATE_SNAPSHOT", threadId: "tg-chat-1", snapshot };

    const after = applyAguiEvent(before, event);

    expect(after.requestCards["tg-chat-1"]).toEqual(snapshot);
    // A field that was present before and absent from the new snapshot is
    // gone, not merged in.
    expect((after.requestCards["tg-chat-1"] as Record<string, unknown>).studentAge).toBeUndefined();
  });
});

describe("applyAguiEvent — STATE_DELTA (dashboard tasks.md §6.2)", () => {
  // @trace TC-PROTO-01
  it("routes through applyJsonPatch, patching only the targeted field", () => {
    const before: DashboardClientState = {
      ...initialDashboardClientState,
      requestCards: { "tg-chat-1": { ...({} as Record<string, unknown>), studentName: "Оксана" } as never },
    };
    const event: AguiEvent = {
      type: "STATE_DELTA",
      threadId: "tg-chat-1",
      delta: [{ op: "add", path: "/studentAge", value: 9 }],
    };

    const after = applyAguiEvent(before, event);

    expect(after.requestCards["tg-chat-1"]!.studentAge).toBe(9);
    expect(after.requestCards["tg-chat-1"]!.studentName).toBe("Оксана");
  });

  it("discards an operation targeting a field absent from the known field set", () => {
    const before: DashboardClientState = {
      ...initialDashboardClientState,
      requestCards: { "tg-chat-1": { ...EMPTY_REQUEST_CARD_FIELDS, studentName: "Оксана" } },
    };
    const event: AguiEvent = {
      type: "STATE_DELTA",
      threadId: "tg-chat-1",
      delta: [
        { op: "add", path: "/notAKnownField", value: "should be dropped" },
        { op: "add", path: "/studentAge", value: 9 },
      ],
    };

    const after = applyAguiEvent(before, event);

    expect((after.requestCards["tg-chat-1"] as Record<string, unknown>).notAKnownField).toBeUndefined();
    expect(after.requestCards["tg-chat-1"]!.studentAge).toBe(9);
  });

  // --- review-gate FIX 3 [MAJOR] --------------------------------------------
  // @trace spec.md:58-67 "Event referencing an unknown request id is
  // ignored". The pipeline always emits a STATE_SNAPSHOT before any
  // STATE_DELTA for a brand-new thread, so a bare STATE_DELTA for a thread
  // this client has never seen a card for is unexpected wire traffic —
  // creating a card from it would render a request the dashboard has no
  // other truth about at all (no snapshot, no active-request row).
  it("FIX 3: a STATE_DELTA for a threadId with no prior card leaves requestCards unchanged (does not create one)", () => {
    const before: DashboardClientState = { ...initialDashboardClientState };
    const event: AguiEvent = {
      type: "STATE_DELTA",
      threadId: "tg-chat-never-seen",
      delta: [{ op: "add", path: "/studentName", value: "Хтось" }],
    };

    const after = applyAguiEvent(before, event);

    expect(after.requestCards).toEqual(before.requestCards);
    expect(after.requestCards["tg-chat-never-seen"]).toBeUndefined();
  });

  it("FIX 3: a STATE_DELTA after a STATE_SNAPSHOT for that thread still patches correctly (existing behaviour preserved)", () => {
    let state: DashboardClientState = { ...initialDashboardClientState };
    state = applyAguiEvent(state, {
      type: "STATE_SNAPSHOT",
      threadId: "tg-chat-1",
      snapshot: { ...EMPTY_REQUEST_CARD_FIELDS, studentName: "Оксана" },
    });
    state = applyAguiEvent(state, {
      type: "STATE_DELTA",
      threadId: "tg-chat-1",
      delta: [{ op: "add", path: "/studentAge", value: 9 }],
    });

    expect(state.requestCards["tg-chat-1"]!.studentName).toBe("Оксана");
    expect(state.requestCards["tg-chat-1"]!.studentAge).toBe(9);
  });

  // --- FIX 2 / FIX 3 interaction regression ---------------------------------
  // FIX 3 gates STATE_DELTA on `requestCards[threadId]` already existing.
  // Without FIX 2 also seeding `requestCards` (not just `conversations`)
  // from a dashboard-scoped STATE_SNAPSHOT, a lead RESUMING an
  // already-active (not brand-new) conversation right after the teacher's
  // dashboard reconnects would have its every subsequent STATE_DELTA
  // silently and PERMANENTLY dropped (`pipeline.ts` only ever emits a
  // per-thread STATE_SNAPSHOT once, on a lead's very first-ever turn) — this
  // proves the seeding keeps that path alive.
  it("FIX 2+3: a resumed conversation seeded from a dashboard STATE_SNAPSHOT still accepts its next STATE_DELTA", () => {
    const dashboardSnapshotEvent: AguiEvent = {
      type: "STATE_SNAPSHOT",
      threadId: "dashboard",
      snapshot: {
        ...emptyDashboard(),
        activeRequests: [
          {
            id: 1,
            lead_id: 1,
            telegram_chat_id: "tg-chat-resumed",
            state: "collecting",
            student_name: "Тарас",
            student_age: 8,
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
          },
        ],
      },
    };

    let state = applyAguiEvent(initialDashboardClientState, dashboardSnapshotEvent);
    expect(state.requestCards["tg-chat-resumed"]).toBeDefined();
    expect(state.requestCards["tg-chat-resumed"]!.studentName).toBe("Тарас");

    state = applyAguiEvent(state, {
      type: "STATE_DELTA",
      threadId: "tg-chat-resumed",
      delta: [{ op: "replace", path: "/format", value: "individual" }],
    });

    expect(state.requestCards["tg-chat-resumed"]!.format).toBe("individual");
    expect(state.requestCards["tg-chat-resumed"]!.studentName).toBe("Тарас"); // not clobbered
  });
});

describe("seedConversationsFromActiveRequests (review-gate FIX 2)", () => {
  it("seeds a fresh conversation + request-card placeholder for an unseen active request", () => {
    const seeded = seedConversationsFromActiveRequests({}, {}, [
      {
        id: 1,
        lead_id: 1,
        telegram_chat_id: "tg-chat-1",
        state: "collecting",
        student_name: "Оксана",
        student_age: 9,
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
      },
    ]);

    expect(seeded.conversations["tg-chat-1"]).toEqual({ threadId: "tg-chat-1", runActive: false, messages: [] });
    expect(seeded.requestCards["tg-chat-1"]).toMatchObject({ studentName: "Оксана", studentAge: 9 });
  });

  // Regression (page-refresh loses the conversation): when a persisted
  // transcript is supplied for a thread, the seeded conversation is
  // pre-populated with it (role-labelled, not streaming) so the live panel
  // shows the history on first paint instead of going blank after reload.
  it("seeds a thread's conversation with its persisted transcript when one is supplied", () => {
    const seeded = seedConversationsFromActiveRequests(
      {},
      {},
      [
        {
          id: 1,
          lead_id: 1,
          telegram_chat_id: "tg-chat-1",
          state: "collecting",
          student_name: "Оксана",
          student_age: 9,
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
        },
      ],
      {
        "tg-chat-1": [
          { role: "user", content: "Хочу записати доньку" },
          { role: "assistant", content: "Радо! Як звати дитину?" },
        ],
      },
    );

    const seededMessages = seeded.conversations["tg-chat-1"]!.messages;
    expect(seededMessages).toHaveLength(2);
    expect(seededMessages[0]).toMatchObject({ role: "user", text: "Хочу записати доньку", streaming: false });
    expect(seededMessages[1]).toMatchObject({ role: "assistant", text: "Радо! Як звати дитину?", streaming: false });
    // Distinct, stable React keys (never the ephemeral live AG-UI uuid space).
    expect(seededMessages[0]!.id).not.toBe(seededMessages[1]!.id);
  });

  it("never clobbers an existing conversation or request card for a thread it has already seen", () => {
    const existingConversations = {
      "tg-chat-1": {
        threadId: "tg-chat-1",
        runActive: true,
        messages: [{ id: "m1", role: "assistant", text: "hi", streaming: false }],
      },
    };
    const existingRequestCards = { "tg-chat-1": { ...EMPTY_REQUEST_CARD_FIELDS, studentName: "Вже є" } };

    const seeded = seedConversationsFromActiveRequests(existingConversations, existingRequestCards, [
      {
        id: 1,
        lead_id: 1,
        telegram_chat_id: "tg-chat-1",
        state: "collecting",
        student_name: "Нове ім'я — має бути проігноровано",
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
      },
    ]);

    expect(seeded.conversations).toEqual(existingConversations);
    expect(seeded.requestCards["tg-chat-1"]!.studentName).toBe("Вже є");
  });
});

describe("applyAguiEvent — TEXT_MESSAGE_* (dashboard tasks.md §6.2)", () => {
  // @trace FR-DASH-01
  it("appends START -> CONTENT -> CONTENT -> END to the right thread's stream, growing incrementally", () => {
    let state = initialDashboardClientState;
    state = applyAguiEvent(state, { type: "RUN_STARTED", threadId: "tg-chat-1", runId: "run-1" });
    state = applyAguiEvent(state, { type: "TEXT_MESSAGE_START", messageId: "msg-1", threadId: "tg-chat-1" });
    state = applyAguiEvent(state, { type: "TEXT_MESSAGE_CONTENT", messageId: "msg-1", delta: "Привіт" });
    state = applyAguiEvent(state, { type: "TEXT_MESSAGE_CONTENT", messageId: "msg-1", delta: ", як справи?" });

    const mid = state.conversations["tg-chat-1"]!.messages[0]!;
    expect(mid.text).toBe("Привіт, як справи?");
    expect(mid.streaming).toBe(true);
    // Live streamed text is always the agent (school) side — the lead's own
    // messages are not streamed over AG-UI (they arrive via the persisted
    // transcript seed instead).
    expect(mid.role).toBe("assistant");

    state = applyAguiEvent(state, { type: "TEXT_MESSAGE_END", messageId: "msg-1" });
    const done = state.conversations["tg-chat-1"]!.messages[0]!;
    expect(done.text).toBe("Привіт, як справи?");
    expect(done.streaming).toBe(false);
  });

  // @trace FR-DASH-01
  it("keeps two concurrent conversations' streamed text fully separate", () => {
    let state = initialDashboardClientState;
    state = applyAguiEvent(state, { type: "TEXT_MESSAGE_START", messageId: "msg-a", threadId: "tg-chat-A" });
    state = applyAguiEvent(state, { type: "TEXT_MESSAGE_START", messageId: "msg-b", threadId: "tg-chat-B" });
    // Interleaved content chunks for the two threads.
    state = applyAguiEvent(state, { type: "TEXT_MESSAGE_CONTENT", messageId: "msg-a", delta: "Лід А: " });
    state = applyAguiEvent(state, { type: "TEXT_MESSAGE_CONTENT", messageId: "msg-b", delta: "Лід Б: " });
    state = applyAguiEvent(state, { type: "TEXT_MESSAGE_CONTENT", messageId: "msg-a", delta: "привіт" });
    state = applyAguiEvent(state, { type: "TEXT_MESSAGE_CONTENT", messageId: "msg-b", delta: "добрий день" });

    expect(state.conversations["tg-chat-A"]!.messages[0]!.text).toBe("Лід А: привіт");
    expect(state.conversations["tg-chat-B"]!.messages[0]!.text).toBe("Лід Б: добрий день");
  });

  it("RUN_STARTED / RUN_FINISHED toggle the conversation's run-active indicator", () => {
    let state = initialDashboardClientState;
    state = applyAguiEvent(state, { type: "RUN_STARTED", threadId: "tg-chat-1", runId: "run-1" });
    expect(state.conversations["tg-chat-1"]!.runActive).toBe(true);

    state = applyAguiEvent(state, { type: "RUN_FINISHED", threadId: "tg-chat-1", runId: "run-1" });
    expect(state.conversations["tg-chat-1"]!.runActive).toBe(false);
  });
});

describe("applyAguiEvent — CUSTOM BOOKING_PENDING (dashboard tasks.md §6.2)", () => {
  const payload = (requestId: number): BookingPendingPayload => ({
    requestId,
    leadId: 1,
    telegramChatId: "tg-chat-1",
    studentName: "Оксана",
    studentAge: 9,
    brief: "brief",
    bookingId: 1,
    calendarEventId: null,
    slotStart: "2026-07-06T10:00:00",
    slotEnd: "2026-07-06T11:00:00",
  });

  // @trace TC-PROTO-01
  it("joins the live pending queue when the request id is known", () => {
    const before = stateWithActiveRequest(1, "tg-chat-1");
    const event: AguiEvent = { type: "CUSTOM", name: "BOOKING_PENDING", value: payload(1) };

    const after = applyAguiEvent(before, event);

    expect(after.livePendingQueue).toHaveLength(1);
    expect(after.livePendingQueue[0]!.requestId).toBe(1);
  });

  // @trace TC-PROTO-01
  it("is dropped without corrupting state when the request id is unknown", () => {
    const before = stateWithActiveRequest(1, "tg-chat-1");
    const event: AguiEvent = { type: "CUSTOM", name: "BOOKING_PENDING", value: payload(999) };

    const after = applyAguiEvent(before, event);

    expect(after.livePendingQueue).toHaveLength(0);
    expect(after.dashboard).toEqual(before.dashboard);
  });
});

describe("connectAgui (dashboard tasks.md §6.2)", () => {
  class FakeEventSource {
    static instances: FakeEventSource[] = [];
    onmessage: ((message: { data: string }) => void) | null = null;
    closed = false;
    url: string;
    constructor(url: string) {
      this.url = url;
      FakeEventSource.instances.push(this);
    }
    close() {
      this.closed = true;
    }
    emit(data: string) {
      this.onmessage?.({ data });
    }
  }

  it("wraps EventSource, forwards parsed events, and closes on cleanup", () => {
    const originalEventSource = (globalThis as { EventSource?: unknown }).EventSource;
    (globalThis as { EventSource: unknown }).EventSource = FakeEventSource;
    FakeEventSource.instances = [];

    try {
      const received: AguiEvent[] = [];
      const cleanup = connectAgui((event) => received.push(event));

      const instance = FakeEventSource.instances[0]!;
      expect(instance.url).toBe("/api/agui/stream");

      instance.emit(JSON.stringify({ type: "RUN_STARTED", threadId: "tg-chat-1", runId: "run-1" }));
      instance.emit("not json {{{");
      instance.emit(JSON.stringify({ type: "RUN_FINISHED", threadId: "tg-chat-1", runId: "run-1" }));

      expect(received).toHaveLength(2);
      expect(received[0]).toEqual({ type: "RUN_STARTED", threadId: "tg-chat-1", runId: "run-1" });

      cleanup();
      expect(instance.closed).toBe(true);
    } finally {
      (globalThis as { EventSource: unknown }).EventSource = originalEventSource;
    }
  });
});
