// @vitest-environment jsdom
// Review-gate S3 remediation — FIX 2 [MAJOR] + FIX 7 [testing gap].
// `DashboardApp` was previously untested end-to-end; these tests exercise
// it through `render()` with a stubbed global `EventSource` (the same
// `FakeEventSource` trick `apps/dashboard/lib/agui-client.test.ts`'s own
// `connectAgui` suite already uses — no jsdom-native `EventSource` exists,
// and `connectAgui` is called unconditionally from `DashboardApp`'s own
// `useEffect`, so every test in this file must stub `globalThis.EventSource`
// BEFORE rendering, even the ones that never emit a single live event).
//
// FIX 2: the conversation panel must render a card for every DB-truth
// active request from the very first paint — `initialSnapshot.activeRequests`
// — without waiting for a live `RUN_STARTED`/`TEXT_MESSAGE_*` event to seed
// `state.conversations` first (baseline spec: a mid-intake lead reconnecting
// the teacher's dashboard must not vanish behind "Поки що тихо").
//
// FIX 7: (a) the `ConnectionIndicator` reacts to the underlying
// `EventSource`'s `onopen`/`onerror` lifecycle (native `EventSource`
// auto-reconnects; this dashboard only surfaces the visible state); (b) the
// pending-queue de-dup (`mergePendingQueue`) shows exactly ONE card for a
// request that arrived first as a live `BOOKING_PENDING` and later as part
// of a reconnect `STATE_SNAPSHOT` for the same request id.

import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { RequestRow } from "@kamerton/db";
import { DashboardApp } from "./DashboardApp.tsx";
import type { DashboardState, PendingQueueEntry } from "../lib/dashboard-state.ts";

/** Mirrors `agui-client.test.ts`'s own `FakeEventSource` — a controllable
 *  double for the native `EventSource` this file stubs onto `globalThis`
 *  before every render (jsdom ships no real `EventSource`). Exposes
 *  `onopen`/`onerror`/`onmessage` as plain settable properties, exactly the
 *  three hooks `connectAgui` (`lib/agui-client.ts`) actually assigns. */
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onmessage: ((message: { data: string }) => void) | null = null;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
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

function stubEventSource(): void {
  FakeEventSource.instances = [];
  (globalThis as { EventSource: unknown }).EventSource = FakeEventSource;
}

function emptyDashboard(): DashboardState {
  return { activeRequests: [], pendingQueue: [], hallMap: [] };
}

function activeRequestRow(overrides: Partial<RequestRow> = {}): RequestRow {
  return {
    id: 1,
    lead_id: 1,
    telegram_chat_id: "tg-chat-1",
    state: "collecting",
    student_name: "Оксана Тестова",
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
    ...overrides,
  };
}

function pendingQueueEntry(overrides: Partial<PendingQueueEntry> = {}): PendingQueueEntry {
  return {
    requestId: 1,
    leadId: 1,
    telegramChatId: "tg-chat-1",
    studentName: "Оксана Тестова",
    studentAge: 9,
    brief: "Оксана Тестова, 9 років.",
    bookingId: 1,
    calendarEventId: null,
    slotStart: "2026-07-10T10:00:00+03:00",
    slotEnd: "2026-07-10T11:00:00+03:00",
    ...overrides,
  };
}

describe("DashboardApp (review-gate FIX 2, FIX 7)", () => {
  afterEach(() => {
    delete (globalThis as { EventSource?: unknown }).EventSource;
    cleanup();
  });

  // --- FIX 2 [MAJOR] --------------------------------------------------------
  it("FIX 2: seeds a conversation card from initialSnapshot.activeRequests with no live events at all", () => {
    stubEventSource();
    const initialSnapshot: DashboardState = {
      ...emptyDashboard(),
      activeRequests: [activeRequestRow()],
    };

    render(<DashboardApp initialSnapshot={initialSnapshot} />);

    // The mid-intake lead's card renders immediately — no RUN_STARTED/
    // TEXT_MESSAGE_* ever arrived in this test.
    expect(screen.getByText("Оксана Тестова")).toBeInTheDocument();
  });

  it("REGRESSION: with no active requests and no live events, the empty state still renders", () => {
    stubEventSource();
    render(<DashboardApp initialSnapshot={emptyDashboard()} />);

    expect(screen.getByText(/поки що тихо/i)).toBeInTheDocument();
  });

  // --- FIX 7 [testing gap] — connection indicator ---------------------------
  it("FIX 7: the disconnected indicator appears on EventSource error and clears again on reconnect (open)", () => {
    stubEventSource();
    render(<DashboardApp initialSnapshot={emptyDashboard()} />);

    const source = FakeEventSource.instances[0]!;
    // The connection starts open (mirrors production: `connectAgui` is
    // called synchronously on mount and the real EventSource typically
    // fires `open` almost immediately). Each lifecycle callback triggers a
    // React state update outside of RTL's own event helpers, so it must be
    // wrapped in `act()` for the DOM to reflect it before the next assertion.
    act(() => source.onopen?.());
    expect(screen.queryByText(/немає з'єднання/i)).not.toBeInTheDocument();

    act(() => source.onerror?.());
    expect(screen.getByText(/немає з'єднання/i)).toBeInTheDocument();

    act(() => source.onopen?.());
    expect(screen.queryByText(/немає з'єднання/i)).not.toBeInTheDocument();
  });

  // --- FIX 7 [testing gap] — pending-queue de-dup on reconnect --------------
  it("FIX 7: a BOOKING_PENDING entry later re-delivered inside a reconnect STATE_SNAPSHOT shows exactly one queue card, not two", () => {
    stubEventSource();
    const initialSnapshot: DashboardState = {
      ...emptyDashboard(),
      activeRequests: [activeRequestRow()],
    };
    render(<DashboardApp initialSnapshot={initialSnapshot} />);
    const source = FakeEventSource.instances[0]!;

    // A live BOOKING_PENDING arrives first.
    act(() =>
      source.emit(JSON.stringify({ type: "CUSTOM", name: "BOOKING_PENDING", value: pendingQueueEntry() })),
    );
    expect(screen.getAllByText("Оксана Тестова")).toHaveLength(2); // conversation card + queue card

    // A reconnect delivers a fresh dashboard-scoped STATE_SNAPSHOT whose own
    // SQLite-backed pendingQueue ALREADY contains the same request (the
    // teacher's decision hasn't landed in SQLite between the two frames).
    const reconnectSnapshot: DashboardState = {
      ...emptyDashboard(),
      activeRequests: [activeRequestRow()],
      pendingQueue: [pendingQueueEntry()],
    };
    act(() =>
      source.emit(JSON.stringify({ type: "STATE_SNAPSHOT", threadId: "dashboard", snapshot: reconnectSnapshot })),
    );

    // Still exactly one queue card — "Черга очікування · 1", not 2.
    expect(screen.getByText("Черга очікування · 1")).toBeInTheDocument();
    expect(screen.getAllByText("Оксана Тестова")).toHaveLength(2); // conversation card + ONE queue card
  });
});
