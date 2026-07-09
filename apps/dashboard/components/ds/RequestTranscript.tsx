"use client";

// apps/dashboard/components/ds — RequestTranscript. Lazy-loads and renders the
// FULL persisted conversation transcript for one request (GET
// /api/requests/:id/messages), so the teacher can read what the lead actually
// said on a pending request's card. Collapsed by default (the card stays
// compact); the fetch fires on first expand, once. Distinct from the live
// "Розмови" SSE feed: that shows only conversations streamed while a tab is
// open, whereas this reads the durable SQLite transcript on demand.

import { useState } from "react";

interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; messages: TranscriptMessage[] }
  | { status: "error" };

const ROLE_LABEL: Record<TranscriptMessage["role"], string> = { user: "Лід", assistant: "Школа" };

export function RequestTranscript({ requestId }: { requestId: number }) {
  const [open, setOpen] = useState(false);
  const [load, setLoad] = useState<LoadState>({ status: "idle" });

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && load.status === "idle") {
      setLoad({ status: "loading" });
      try {
        const response = await fetch(`/api/requests/${requestId}/messages`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as { messages?: TranscriptMessage[] };
        setLoad({ status: "loaded", messages: data.messages ?? [] });
      } catch {
        setLoad({ status: "error" });
      }
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        data-testid="transcript-toggle"
        className="flex items-center gap-1.5 self-start text-[11px] font-medium uppercase tracking-wide text-text-muted hover:text-text"
      >
        <span aria-hidden>{open ? "▾" : "▸"}</span>
        Листування з лідом
      </button>

      {open ? (
        <div
          data-testid="transcript-body"
          className="flex max-h-64 flex-col gap-2 overflow-y-auto rounded-md border border-border bg-surface-hover p-3"
        >
          {load.status === "loading" ? (
            <span className="text-sm text-text-muted">Завантажую…</span>
          ) : load.status === "error" ? (
            <span className="text-sm text-danger">Не вдалося завантажити листування.</span>
          ) : load.status === "loaded" && load.messages.length === 0 ? (
            <span className="text-sm text-text-muted">Повідомлень поки немає.</span>
          ) : load.status === "loaded" ? (
            load.messages.map((message, index) => (
              <div key={index} className="flex min-w-0 flex-col gap-0.5">
                <span
                  className={`text-[11px] font-medium uppercase tracking-wide ${
                    message.role === "assistant" ? "text-brand" : "text-text-muted"
                  }`}
                >
                  {ROLE_LABEL[message.role]}
                </span>
                <span className="text-sm break-words whitespace-pre-wrap text-text">{message.content}</span>
              </div>
            ))
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
