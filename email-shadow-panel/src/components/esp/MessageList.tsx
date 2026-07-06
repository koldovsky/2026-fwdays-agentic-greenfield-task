import type { InboxApiClientError } from "@/lib/inboxApiClient";
import type { InboxMessageSummary } from "@/types/inbox";
import { cn } from "@/lib/utils";
import { Inbox, Loader2, Radio, RotateCcw, TriangleAlert } from "lucide-react";
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
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <div className="flex items-center gap-2 font-mono-tabular text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          <Radio className="size-3 text-signal/70" /> Messages
        </div>
        <div className="font-mono-tabular text-[10px] uppercase tracking-[0.24em] text-muted-foreground/70">
          {loading || refreshing ? (
            <span className="inline-flex items-center gap-1.5 text-signal">
              <Loader2 className="size-3 animate-spin" />
              {loading ? "listening" : "syncing"}
            </span>
          ) : (
            `${messages.length} total`
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && messages.length === 0 ? (
          <div className="divide-y divide-hairline">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse space-y-2 px-4 py-4">
                <div className="h-2.5 w-1/3 rounded bg-muted/70" />
                <div className="h-3 w-2/3 rounded bg-muted/60" />
                <div className="h-2 w-1/2 rounded bg-muted/40" />
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
                  className="inline-flex items-center gap-2 rounded-md border border-hairline bg-surface-raised px-3 py-2 font-mono-tabular text-[10px] uppercase tracking-[0.18em] text-foreground transition-colors hover:border-signal/40 hover:text-signal"
                >
                  <RotateCcw className="size-3.5" /> Retry
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
            {messages.map((message, index) => {
              const active = message.reference === selectedId;
              return (
                <li key={message.reference}>
                  <button
                    type="button"
                    onClick={() => onSelect(message)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "group relative flex min-h-[76px] w-full items-start gap-3 px-4 py-3.5 text-left transition-colors fade-up",
                      "hover:bg-surface-raised/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal/45",
                      active &&
                        "bg-signal/10 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--signal)_28%,transparent)]",
                    )}
                    style={{ animationDelay: `${index * 45}ms` }}
                  >
                    {active ? (
                      <span
                        aria-hidden
                        className="absolute inset-y-2 left-0 w-[2px] rounded-r bg-signal shadow-[0_0_12px_var(--signal)]"
                      />
                    ) : null}
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full transition-colors",
                        active
                          ? "bg-signal shadow-[0_0_8px_var(--signal)]"
                          : "bg-muted-foreground/35",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span
                          className={cn(
                            "truncate text-sm",
                            active ? "text-foreground font-medium" : "text-foreground",
                          )}
                        >
                          {message.from}
                        </span>
                        <span className="font-mono-tabular text-[10px] uppercase tracking-wider text-muted-foreground/80">
                          {message.time}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "mt-0.5 truncate text-[13px]",
                          active ? "text-foreground" : "text-foreground/90",
                        )}
                      >
                        {message.subject}
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground/80">
                        {message.preview}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
