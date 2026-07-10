import type { InboxApiClientError } from "@/lib/inboxApiClient";
import { getSenderInitials } from "@/lib/senderInitials";
import type { InboxMessageSummary } from "@/types/inbox";
import { cn } from "@/lib/utils";
import { Inbox, Loader2, Mail, Radio, RotateCcw, TriangleAlert } from "lucide-react";
import { EmptyState } from "./EmptyState";

interface Props {
  messages: InboxMessageSummary[];
  selectedId: string | null;
  onSelect: (message: InboxMessageSummary) => void;
  loading?: boolean;
  refreshing?: boolean;
  error?: InboxApiClientError | null;
  lastCheckedAt?: string;
  onRetry?: () => void;
}

function formatLastCheckedLabel(lastCheckedAt: string | undefined): string {
  if (!lastCheckedAt) {
    return "Waiting for the first inbox check";
  }

  const timestamp = Date.parse(lastCheckedAt);
  if (!Number.isFinite(timestamp)) {
    return "Last checked recently";
  }

  return `Last checked ${new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export function MessageList({
  messages,
  selectedId,
  onSelect,
  loading,
  refreshing,
  error,
  lastCheckedAt,
  onRetry,
}: Props) {
  const statusLabel = loading
    ? "Listening"
    : refreshing
      ? "Refreshing"
      : error
        ? "Last check failed"
        : "Listening";
  const statusDescription =
    refreshing || loading
      ? "Refreshing mailbox"
      : error
        ? "Last check failed"
        : "Listening for new messages";
  const lastCheckedLabel = formatLastCheckedLabel(lastCheckedAt);

  return (
    <div className="panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-hairline/45 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="text-[1.45rem] font-semibold leading-tight text-foreground">Messages</h2>
          <span className="shrink-0 whitespace-nowrap rounded-md border border-hairline/55 bg-muted/24 px-2.5 py-1 text-sm text-muted-foreground">
            {messages.length} total
          </span>
        </div>
        <div className="flex min-w-[7.75rem] shrink-0 justify-end">
          <span
            className={cn(
              "inline-flex h-5 shrink-0 items-center gap-2 text-sm",
              refreshing || loading
                ? "text-signal"
                : error
                  ? "text-amber"
                  : "text-muted-foreground",
            )}
          >
            {refreshing || loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Radio className="size-4" aria-hidden />
            )}
            <span>{statusLabel}</span>
          </span>
        </div>
      </div>

      <div className="esp-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        {loading && messages.length === 0 ? (
          <div className="grid gap-1.5 p-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse space-y-3 rounded-xl bg-background/18 px-5 py-5"
              >
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
          <ul className="grid min-w-0 max-w-full gap-1.5 overflow-hidden p-2">
            {messages.map((message) => {
              const active = message.reference === selectedId;
              return (
                <li key={message.reference} className="min-w-0 max-w-full overflow-hidden">
                  <button
                    type="button"
                    onClick={() => onSelect(message)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "group relative box-border flex min-h-[88px] w-full max-w-full min-w-0 items-start gap-3 overflow-hidden rounded-xl border px-3.5 py-3 text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal/65",
                      active
                        ? "border-signal/36 bg-signal/10 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--signal)_26%,transparent)]"
                        : "border-hairline/45 bg-background/16 hover:border-signal/18 hover:bg-surface-raised/55",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-full border font-mono-tabular text-[0.8rem] font-semibold",
                        active
                          ? "border-signal/34 bg-signal/20 text-signal"
                          : "border-hairline/45 bg-background/40 text-muted-foreground",
                      )}
                    >
                      {getSenderInitials(message.from)}
                    </span>
                    <span className="min-w-0 flex-1 overflow-hidden">
                      <span className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 overflow-hidden">
                        <span className="truncate whitespace-nowrap text-[0.93rem] font-semibold leading-snug text-foreground">
                          {message.from}
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-[0.8rem] text-muted-foreground">
                          {message.time}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate whitespace-nowrap text-[0.9rem] leading-snug text-foreground/92">
                        {message.subject}
                      </span>
                      <span className="mt-0.5 block truncate whitespace-nowrap text-[0.82rem] leading-snug text-muted-foreground">
                        {message.preview}
                      </span>
                      {active ? <span className="sr-only">Selected message</span> : null}
                    </span>
                    {active ? (
                      <Radio className="mt-0.5 size-3.5 shrink-0 text-signal" aria-hidden />
                    ) : (
                      <Mail
                        className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/55"
                        aria-hidden
                      />
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
        className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-hairline/45 bg-background/14 px-4 py-2.5 text-sm text-muted-foreground"
      >
        <span
          className={cn(
            "inline-flex min-w-0 items-center gap-2",
            refreshing || loading ? "text-signal" : error ? "text-amber" : "text-muted-foreground",
          )}
        >
          {refreshing || loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Radio className="size-4" aria-hidden />
          )}
          <span className="truncate">{statusDescription}</span>
        </span>
        <span className="shrink-0 justify-self-end whitespace-nowrap text-right">
          {lastCheckedLabel}
        </span>
      </div>
    </div>
  );
}
