import { getRecentInboxPanelState } from "@/lib/recentInboxPanelState";
import type { RecentInboxRecord } from "@/types/inbox";
import { cn } from "@/lib/utils";
import { Archive, ArrowRight, Clock3, Inbox, Mail, RotateCcw, Sparkles, Timer } from "lucide-react";

interface Props {
  items: RecentInboxRecord[];
  selectedInboxId?: string | null;
  onOpen: (id: string) => void;
}

function EmptyRecentInboxes() {
  return (
    <div className="flex min-h-[560px] flex-col justify-between gap-8 p-5 sm:p-7">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="relative mb-8 grid size-28 place-items-center rounded-full border border-signal/25 bg-signal/5 text-signal">
          <Inbox className="size-12" strokeWidth={1.6} />
          <span aria-hidden className="absolute -left-4 top-1/2 text-signal/70">
            +
          </span>
          <span aria-hidden className="absolute -right-4 top-1/3 text-signal/70">
            +
          </span>
          <span aria-hidden className="absolute bottom-0 right-6 text-signal/70">
            +
          </span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          No recent inboxes yet
        </h2>
        <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
          Generated inboxes will appear here for quick access. This information is stored only in
          this browser.
        </p>
        <p className="mt-8 inline-flex items-center gap-3 text-base text-foreground/90">
          <Sparkles className="size-5 text-signal" aria-hidden />
          Generate an inbox from the panel on the left.
        </p>
      </div>

      <div className="rounded-md border border-hairline bg-background/30 p-5">
        <div className="font-mono-tabular text-[11px] uppercase tracking-[0.22em] text-signal">
          What you'll see here
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-md border border-hairline bg-surface/55 px-4 py-3">
          <span className="grid size-9 place-items-center rounded-md border border-signal/20 bg-signal/10 text-signal">
            <Mail className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate font-mono-tabular text-sm text-foreground">
            your.alias@inbox.email
          </span>
          <span className="rounded-sm border border-signal/20 bg-signal/10 px-3 py-1 font-mono-tabular text-xs text-signal">
            3 new
          </span>
          <span className="font-mono-tabular text-xs text-muted-foreground">2 minutes ago</span>
        </div>
        <div className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
          <span className="inline-flex items-center gap-2">
            <Archive className="size-3.5" aria-hidden /> Inbox address
          </span>
          <span className="inline-flex items-center gap-2">
            <Mail className="size-3.5" aria-hidden /> Message count
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock3 className="size-3.5" aria-hidden /> Last used time
          </span>
        </div>
      </div>
    </div>
  );
}

export function RecentInboxesPanel({ items, selectedInboxId, onOpen }: Props) {
  const panelState = getRecentInboxPanelState(items);

  return (
    <section
      className="panel corner-ticks relative min-h-[620px] overflow-hidden"
      aria-labelledby="recent-inboxes-title"
    >
      <div className="flex items-center justify-between gap-4 border-b border-hairline/70 px-5 py-5 sm:px-7">
        <div className="flex items-center gap-3 font-mono-tabular text-[12px] uppercase tracking-[0.24em] text-muted-foreground">
          <Clock3 className="size-4" aria-hidden />
          <h2 id="recent-inboxes-title">Recent inboxes</h2>
        </div>
        <span className="font-mono-tabular text-sm text-signal">{panelState.savedCountLabel}</span>
      </div>

      {panelState.kind === "empty" ? (
        <EmptyRecentInboxes />
      ) : (
        <div className="grid gap-5 p-5 sm:p-6">
          <div className="overflow-hidden rounded-md border border-hairline bg-background/25">
            {panelState.rows.map((row) => {
              const selected = row.id === selectedInboxId;
              return (
                <div
                  key={row.id}
                  className="grid gap-3 border-b border-hairline/70 p-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span
                      className={cn(
                        "grid size-11 shrink-0 place-items-center rounded-md border",
                        row.expired
                          ? "border-destructive/35 bg-destructive/15 text-destructive"
                          : "border-signal/20 bg-signal/10 text-signal",
                      )}
                    >
                      <Mail className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-mono-tabular text-sm font-semibold text-foreground">
                        {row.address}
                      </div>
                      <div
                        className={cn(
                          "mt-1 text-sm",
                          row.expired ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {row.lastUsedLabel}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:justify-end">
                    <span
                      className={cn(
                        "rounded-sm border px-3 py-1 font-mono-tabular text-sm",
                        row.expired
                          ? "border-destructive/25 bg-destructive/10 text-destructive"
                          : row.messageBadgeLabel === "0 new"
                            ? "border-hairline bg-muted/30 text-muted-foreground"
                            : "border-signal/20 bg-signal/10 text-signal",
                      )}
                    >
                      {row.expired ? "Expired" : row.messageBadgeLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpen(row.id)}
                      className="inline-flex h-10 items-center justify-center gap-3 rounded-md border border-signal/35 bg-transparent px-4 text-sm font-semibold text-foreground transition-colors hover:border-signal/70 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {row.expired ? "Restore" : selected ? "Open" : "Open"}
                      {row.expired ? (
                        <RotateCcw className="size-4" aria-hidden />
                      ) : (
                        <ArrowRight className="size-4" aria-hidden />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-md border border-hairline bg-background/30 p-4 text-sm leading-relaxed text-muted-foreground">
            <Sparkles className="mr-3 inline size-4 text-signal" aria-hidden />
            Continue verification with links or one-time codes. Open an inbox to view messages and
            complete your signups.
          </div>
        </div>
      )}
    </section>
  );
}
