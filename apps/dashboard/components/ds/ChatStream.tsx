// apps/dashboard/components/ds — ChatStream (dashboard tasks.md §6.5,
// baseline spec's "Live conversation view with streamed agent text" +
// "Very long streamed message in the ChatStream" requirements). Renders a
// conversation's messages incrementally as `TEXT_MESSAGE_CONTENT` chunks
// arrive (via the caller's `agui-client.ts` reducer state, not fetched
// here) and a `role="status"` run indicator present ONLY while
// `runActive` is true — the baseline spec's own "a distinct UI element
// present in the DOM only between RUN_STARTED and RUN_FINISHED" wording.
//
// The whole stream scrolls vertically WITHIN this component (`overflow-y`,
// fixed `max-height`) so a reply "far longer than the visible chat area"
// never grows the surrounding layout (queue/HallMap keep their own
// dimensions) and never adds a horizontal scrollbar (`break-words`).
//
// NEWEST-FIRST: messages arrive oldest-first (the reducer appends; the
// snapshot seed is chronological) but are RENDERED top-to-bottom newest-first,
// so the teacher always sees the latest lead/agent line without scrolling the
// box. The run indicator sits above the list for the same reason.

import type { ChatMessage } from "../../lib/agui-client.ts";
import { EmptyState } from "./EmptyState.tsx";

export interface ChatStreamProps {
  messages: ChatMessage[];
  runActive?: boolean;
}

export function ChatStream({ messages, runActive = false }: ChatStreamProps) {
  if (messages.length === 0 && !runActive) {
    return <EmptyState message="Поки що тихо — розмов немає" icon="chat" />;
  }

  // Newest-first: reverse a COPY (never mutate the caller's array) so the most
  // recent line renders at the top.
  const newestFirst = [...messages].reverse();

  return (
    <div className="flex max-h-80 w-full max-w-full flex-col gap-3 overflow-y-auto overflow-x-hidden rounded-md border border-border bg-surface p-3">
      {runActive ? (
        <div role="status" aria-live="polite" data-testid="run-indicator" className="flex items-center gap-1.5 text-xs text-text-muted">
          <span className="chat-typing-shimmer">Агент відповідає…</span>
        </div>
      ) : null}
      {newestFirst.map((message) => {
        // "Лід" (the lead) vs "Школа" (the agent) — same label vocabulary as
        // the pending-card transcript (`RequestTranscript`) so a teacher reads
        // one consistent naming across the live panel and the card.
        const isLead = message.role === "user";
        return (
          <div key={message.id} className="flex w-full max-w-full flex-col gap-0.5">
            <span
              className={`text-[11px] font-medium uppercase tracking-wide ${isLead ? "text-text-muted" : "text-primary"}`}
            >
              {isLead ? "Лід" : "Школа"}
            </span>
            <p className="w-full max-w-full whitespace-pre-wrap break-words text-sm text-text">
              {message.text}
              {message.streaming ? (
                <span className="chat-typing-shimmer ml-0.5 inline-block" aria-hidden="true">
                  ▍
                </span>
              ) : null}
            </p>
          </div>
        );
      })}
    </div>
  );
}
