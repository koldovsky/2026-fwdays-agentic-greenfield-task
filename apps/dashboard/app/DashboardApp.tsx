"use client";

// apps/dashboard/app/DashboardApp — the client half of the dashboard page
// (dashboard tasks.md §6.9). Hydrates from the server-rendered initial
// snapshot (`page.tsx`, `dashboard-db.ts`) so the page never shows a blank
// flash before the first SSE frame arrives, then folds every `connectAgui`
// event through `applyAguiEvent` (`lib/agui-client.ts`) to stay live —
// conversation panel (`ChatStream` + `RequestCard`), the pending queue
// (with the zero-state), `HallMap`, and a `ConnectionIndicator`.

import { useEffect, useMemo, useReducer, useState } from "react";
import {
  ChatStream,
  ConnectionIndicator,
  DeleteLeadButton,
  EmptyState,
  HallMap,
  QuestionInbox,
  RequestCard,
  StatusBadge,
} from "../components/ds/index.ts";
import { upcomingBeyondGrid } from "../lib/upcoming-bookings.ts";
import {
  applyAguiEvent,
  connectAgui,
  seedConversationsFromActiveRequests,
  type BookingPendingPayload,
  type DashboardClientState,
} from "../lib/agui-client.ts";
import { candidateProposalSlots } from "../lib/candidate-proposal-slots.ts";
// Deliberately from `current-week.ts`, NOT `dashboard-db.ts` — this is a
// client component; `dashboard-db.ts` has a Node-only (`node:url`/
// `node:path`) top-level side effect that broke every real browser render
// (booking-hitl S4 rendered-UI gate finding, `current-week.ts`'s own header).
import { currentWeekStartIso } from "../lib/current-week.ts";
import type { DashboardState } from "../lib/dashboard-state.ts";
import { requestRowToCardFields } from "../lib/request-card-fields.ts";

export interface DashboardAppProps {
  initialSnapshot: DashboardState;
}

/** Ukrainian short weekday labels (0 = Sunday), same vocabulary as
 *  RequestCard/HallMap. */
const WEEKDAY_LABELS = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;

/** "2026-07-14T16:00" -> "Вт, 14.07 о 16:00" (Kyiv wall clock, already local —
 *  parsed as a calendar date so the weekday never shifts by timezone). */
function formatSlot(slotStartIso: string): string {
  const [datePart, timePart = ""] = slotStartIso.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return slotStartIso;
  const weekday = WEEKDAY_LABELS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday}, ${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")} о ${timePart.slice(0, 5)}`;
}

/** Merges the SQLite-backed pending queue with any live `BOOKING_PENDING`
 *  entries that arrived since — live entries win on a shared `requestId`
 *  (they are strictly newer than whatever the last ingest-driven
 *  `STATE_SNAPSHOT` captured). */
function mergePendingQueue(
  fromSnapshot: DashboardState["pendingQueue"],
  live: BookingPendingPayload[],
): BookingPendingPayload[] {
  const byRequestId = new Map<number, BookingPendingPayload>();
  for (const entry of fromSnapshot) byRequestId.set(entry.requestId, entry);
  for (const entry of live) byRequestId.set(entry.requestId, entry);
  return [...byRequestId.values()];
}

/** `useReducer`'s lazy-init function (`useReducer(reducer, initialArg, init)`
 *  — runs exactly once, on mount, never on every re-render). Review-gate
 *  FIX 2 [MAJOR]: seeds a conversation + request-card placeholder for every
 *  DB-truth active request from the server-rendered initial snapshot, so a
 *  mid-intake lead's card renders on the very first paint — never waiting
 *  for a live `RUN_STARTED`/`TEXT_MESSAGE_*` event to seed it first (see
 *  `seedConversationsFromActiveRequests`'s own header for why
 *  `requestCards` is seeded too, not just `conversations`). */
function buildInitialClientState(initialSnapshot: DashboardState): DashboardClientState {
  const seeded = seedConversationsFromActiveRequests(
    {},
    {},
    initialSnapshot.activeRequests,
    initialSnapshot.conversationMessages,
  );
  return {
    connected: false,
    dashboard: initialSnapshot,
    conversations: seeded.conversations,
    requestCards: seeded.requestCards,
    livePendingQueue: [],
  };
}

export function DashboardApp({ initialSnapshot }: DashboardAppProps) {
  const [state, dispatch] = useReducer(applyAguiEvent, initialSnapshot, buildInitialClientState);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const cleanup = connectAgui((event) => dispatch(event), {
      onOpen: () => setConnected(true),
      onError: () => setConnected(false),
    });
    return cleanup;
  }, []);

  const dashboard = state.dashboard ?? initialSnapshot;
  // Default the array fields up front: a `dashboard` object hydrated before a
  // field existed (a dev hot-reload preserving reducer state) would otherwise
  // crash the render on `.length`/`.map`/`.filter` (admin-crash regression,
  // cleared by a reload). Production fresh loads always carry them.
  const hallMapSeats = dashboard.hallMap ?? [];
  const confirmedBookings = dashboard.confirmedBookings ?? [];
  const pendingQueue = useMemo(
    () => mergePendingQueue(dashboard.pendingQueue ?? [], state.livePendingQueue),
    [dashboard.pendingQueue, state.livePendingQueue],
  );
  // The DecisionBar "Propose another time" picker's on-grid candidates
  // (booking-hitl S4, review-gate CRITICAL fix): this week's grid minus
  // every seat the current `hallMap` reports as taken — recomputed whenever a
  // fresh `hallMap` arrives via `STATE_SNAPSHOT`/`STATE_DELTA`.
  const candidateSlots = useMemo(
    () => candidateProposalSlots({ ...dashboard, hallMap: hallMapSeats }, currentWeekStartIso()),
    [dashboard, hallMapSeats],
  );
  // Bookings the week-scoped grid can't show (next week onward) — listed
  // beneath the HallMap so no confirmed/pending lesson is ever hidden.
  const upcoming = useMemo(
    () => upcomingBeyondGrid(hallMapSeats.map((seat) => seat.slotStartIso), confirmedBookings, pendingQueue),
    [hallMapSeats, confirmedBookings, pendingQueue],
  );

  const conversations = Object.values(state.conversations);
  const pendingCount = pendingQueue.length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Kamerton — панель викладача</h1>
          <p className="text-sm text-text-secondary">Розмови, заявки та розклад залу в реальному часі.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Очікують</span>
            <span className="font-mono text-3xl leading-none text-text">{pendingCount}</span>
          </div>
          <ConnectionIndicator connected={connected} />
        </div>
      </header>

      <section aria-label="Розмови" className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Розмови</h2>
        {conversations.length === 0 ? (
          <EmptyState message="Поки що тихо — розмов немає" icon="chat" />
        ) : (
          conversations.map((conversation) => {
            const activeRequest = dashboard.activeRequests.find(
              (request) => request.telegram_chat_id === conversation.threadId,
            );
            const fields = state.requestCards[conversation.threadId] ??
              (activeRequest !== undefined ? requestRowToCardFields(activeRequest) : undefined);
            return (
              <div key={conversation.threadId} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ChatStream messages={conversation.messages} runActive={conversation.runActive} />
                {fields !== undefined ? (
                  <div className="flex flex-col gap-2">
                    <RequestCard fields={fields} />
                    {activeRequest !== undefined ? (
                      <DeleteLeadButton leadId={activeRequest.lead_id} />
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </section>

      <section aria-label="Черга очікування" className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Черга очікування · {pendingCount}</h2>
        {pendingQueue.length === 0 ? (
          <EmptyState message="Заявок, що очікують рішення, немає" icon="calendar" />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {pendingQueue.map((entry) => (
              <div key={entry.requestId} className="flex flex-col gap-2">
                <RequestCard
                  fields={{
                    studentName: entry.studentName,
                    studentAge: entry.studentAge,
                    format: null,
                    goalTag: null,
                    goalText: null,
                    tastes: null,
                    dreamSong: null,
                    experience: null,
                    comfort: null,
                    preferredWeekdays: null,
                    preferredTimeRange: null,
                  }}
                  brief={entry.brief}
                  status="pending"
                  requestId={entry.requestId}
                  showDecisionBar
                  candidateSlots={candidateSlots}
                  bookedSlotStart={entry.slotStart}
                  showTranscript
                />
                <DeleteLeadButton leadId={entry.leadId} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Підтверджені заняття" className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          Підтверджені заняття · {confirmedBookings.length}
        </h2>
        {confirmedBookings.length === 0 ? (
          <EmptyState message="Підтверджених занять поки немає" icon="calendar" />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {confirmedBookings.map((b) => (
              <RequestCard
                key={`${b.requestId}-${b.slotStart}`}
                fields={{
                  studentName: b.studentName,
                  studentAge: b.studentAge,
                  format: null,
                  goalTag: null,
                  goalText: null,
                  tastes: null,
                  dreamSong: null,
                  experience: null,
                  comfort: null,
                  preferredWeekdays: null,
                  preferredTimeRange: null,
                }}
                status="confirmed"
                requestId={b.requestId}
                bookedSlotStart={b.slotStart}
              />
            ))}
          </div>
        )}
      </section>

      <section aria-label="Розклад залу" className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Розклад залу · цей тиждень</h2>
        <HallMap seats={hallMapSeats} pendingQueue={pendingQueue} confirmedBookings={confirmedBookings} />
        {upcoming.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
              Майбутні заняття (поза цим тижнем) · {upcoming.length}
            </h3>
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
              {upcoming.map((b) => (
                <li key={`${b.requestId}-${b.slotStart}`} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate text-sm text-text">{b.studentName ?? "Заявка"}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-sm text-text-secondary">{formatSlot(b.slotStart)}</span>
                    <StatusBadge status={b.status} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section aria-label="Питання лідів" className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Питання лідів</h2>
        <QuestionInbox />
      </section>
    </div>
  );
}
