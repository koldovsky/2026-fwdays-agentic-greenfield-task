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
  RequestCard,
} from "../components/ds/index.ts";
import {
  applyAguiEvent,
  connectAgui,
  type BookingPendingPayload,
  type DashboardClientState,
} from "../lib/agui-client.ts";
import type { DashboardState } from "../lib/dashboard-state.ts";
import { requestRowToCardFields } from "../lib/request-card-fields.ts";

export interface DashboardAppProps {
  initialSnapshot: DashboardState;
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

export function DashboardApp({ initialSnapshot }: DashboardAppProps) {
  const [state, dispatch] = useReducer(applyAguiEvent, {
    connected: false,
    dashboard: initialSnapshot,
    conversations: {},
    requestCards: {},
    livePendingQueue: [],
  } satisfies DashboardClientState);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const cleanup = connectAgui((event) => dispatch(event), {
      onOpen: () => setConnected(true),
      onError: () => setConnected(false),
    });
    return cleanup;
  }, []);

  const dashboard = state.dashboard ?? initialSnapshot;
  const pendingQueue = useMemo(
    () => mergePendingQueue(dashboard.pendingQueue, state.livePendingQueue),
    [dashboard.pendingQueue, state.livePendingQueue],
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
                />
                <DeleteLeadButton leadId={entry.leadId} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Розклад залу" className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Розклад залу</h2>
        <HallMap seats={dashboard.hallMap} pendingQueue={pendingQueue} />
      </section>
    </div>
  );
}
