import type { InboxApiClientError } from "@/lib/inboxApiClient";
import type { InboxMessageSummary } from "@/types/inbox";
import { cn } from "@/lib/utils";
import { Inbox, Loader2, Mail, Radio, RotateCcw, TriangleAlert, Waves } from "lucide-react";
import { EmptyState } from "./EmptyState";

interface Props {
  messages: InboxMessageSummary[];
  selectedId: string | null;
  onSelect: (message: InboxMessageSummary) => void;
  loading?: boolean;
  refreshing?: boolean;
  error?: InboxApiClientError | null;
  onRetry?: () => void;
}

function senderInitials(sender: string): string {
  const cleaned = sender.replace(/<.*?>/gu, "").trim();
  const words = cleaned.split(/\s+/u).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]?.slice(0, 2).toUpperCase() ?? "?";
  return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
}

export function MessageList({
  messages,
  selectedId,
  onSelect,
  loading,
  refreshing,
  error,
  onRetry,
}: Props) {
  return (
    <div className="panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-foreground">Messages</h2>
          <span className="rounded-md border border-hairline bg-muted/35 px-2.5 py-1 text-sm text-muted-foreground">
            {messages.length} total
          </span>
        </div>
        {loading || refreshing ? (
          <span className="inline-flex items-center gap-2 text-sm text-signal">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {loading ? "Listening" : "Refreshing"}
          </span>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && messages.length === 0 ? (
          <div className="divide-y divide-hairline">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse space-y-3 px-5 py-5">
                <div className="h-3 w-1/3 rounded bg-muted/70" />
                <div className="h-4 w-2/3 rounded bg-muted/60" />
                <div className="h-3 w-1/2 rounded bg-muted/40" />
              </div>
            ))}
          </div>
        ) : error && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="px-6 py-10 text-center">
              <EmptyState
                icon={<TriangleAlert className="size-5" />}
                title="Inbox refresh failed"
                description={error.message}
              />
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-2 rounded-md border border-hairline bg-surface-raised px-3 py-2 font-mono-tabular text-[10px] uppercase tracking-[0.18em] text-foreground transition-colors hover:border-signal/40 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  <RotateCcw className="size-3.5" aria-hidden /> Retry
                </button>
              ) : null}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-5" />}
            title="No messages yet"
            description="This inbox is open and listening. Refresh manually or wait for the next bounded poll."
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {messages.map((message) => {
              const active = message.reference === selectedId;
              return (
                <li key={message.reference}>
                  <button
                    type="button"
                    onClick={() => onSelect(message)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "group relative flex min-h-[82px] w-full items-start gap-4 px-5 py-4 text-left transition-colors",
                      "hover:bg-surface-raised/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal/65",
                      active &&
                        "bg-signal/10 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--signal)_38%,transparent)]",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-11 shrink-0 place-items-center rounded-full border font-mono-tabular text-sm font-semibold",
                        active
                          ? "border-signal/40 bg-signal/25 text-signal"
                          : "border-hairline bg-background/45 text-muted-foreground",
                      )}
                    >
                      {senderInitials(message.from)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-base font-semibold text-foreground">
                          {message.from}
                        </span>
                        <span className="shrink-0 text-sm text-muted-foreground">
                          {message.time}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-sm text-foreground/90">
                        {message.subject}
                      </span>
                      <span className="mt-1 block truncate break-all text-sm text-muted-foreground">
                        {message.preview}
                      </span>
                      {active ? <span className="sr-only">Selected message</span> : null}
                    </span>
                    {active ? (
                      <Radio className="mt-1 size-4 shrink-0 text-signal" aria-hidden />
                    ) : (
                      <Mail className="mt-1 size-4 shrink-0 text-muted-foreground/55" aria-hidden />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div
        role="status"
        aria-live="polite"
        className="border-t border-hairline px-5 py-3 text-sm text-muted-foreground"
      >
        <span className="inline-flex items-center gap-2 text-signal">
          <Waves className="size-4" aria-hidden /> Listening for new messages
        </span>
        <span className="mx-3 text-hairline">/</span>
        Last checked just now
      </div>
    </div>
  );
}
