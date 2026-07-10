import { useMemo, useState } from "react";
import { ArrowRight, Clock3, Inbox, Mail, Sparkles, Trash2 } from "lucide-react";
import { MailProviderIcon } from "./AppLogo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { getRecentInboxPanelState } from "@/lib/recentInboxPanelState";
import type { RecentInboxRecord } from "@/types/inbox";

interface Props {
  items: RecentInboxRecord[];
  selectedInboxId?: string | null;
  onOpen: (id: string) => void;
  onForget: (id: string) => void;
}

function EmptyRecentInboxes() {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 p-3 sm:p-3.5">
      <div className="flex flex-none flex-col items-center justify-center text-center">
        <div className="relative mb-3 grid size-14 place-items-center rounded-full border border-signal/18 bg-signal/5 text-signal sm:size-16">
          <Inbox className="size-7 sm:size-8" strokeWidth={1.6} />
          <span aria-hidden className="esp-empty-orbit absolute -left-4 top-1/2 text-signal/70">
            +
          </span>
          <span aria-hidden className="esp-empty-orbit absolute -right-4 top-1/3 text-signal/70">
            +
          </span>
          <span aria-hidden className="esp-empty-orbit absolute bottom-0 right-6 text-signal/70">
            +
          </span>
        </div>
        <h2 className="text-[1.35rem] font-semibold tracking-tight text-foreground sm:text-[1.55rem]">
          No recent inboxes yet
        </h2>
        <p className="mt-1.5 max-w-sm text-[0.88rem] leading-relaxed text-muted-foreground">
          Generated inboxes will appear here for quick access. This information is stored only in
          this browser.
        </p>
        <p className="mt-3 inline-flex items-center gap-2.5 text-[0.88rem] text-foreground/88">
          <Sparkles className="size-[18px] text-signal" aria-hidden />
          Generate an inbox from the panel on the left.
        </p>
      </div>

      <div className="rounded-xl border border-hairline/45 bg-background/22 p-3">
        <div className="font-mono-tabular text-[11px] uppercase tracking-[0.22em] text-signal">
          What you&apos;ll see here
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2.5 rounded-xl bg-surface/40 px-3 py-2">
          <span className="grid size-8 place-items-center rounded-lg border border-signal/18 bg-signal/10 text-signal">
            <Mail className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate font-mono-tabular text-sm text-foreground">
            your.alias@inbox.email
          </span>
          <span className="rounded-sm border border-signal/18 bg-signal/10 px-3 py-1 font-mono-tabular text-xs text-signal">
            3 new
          </span>
          <span className="font-mono-tabular text-xs text-muted-foreground">2 minutes ago</span>
        </div>
      </div>
    </div>
  );
}

export function RecentInboxesPanel({ items, selectedInboxId, onOpen, onForget }: Props) {
  const [pendingForgetId, setPendingForgetId] = useState<string | null>(null);
  const panelState = getRecentInboxPanelState(items);
  const pendingForgetRow = useMemo(
    () =>
      panelState.kind === "saved"
        ? (panelState.rows.find((row) => row.id === pendingForgetId) ?? null)
        : null,
    [panelState, pendingForgetId],
  );

  return (
    <section
      className="panel corner-ticks relative flex min-h-0 flex-col overflow-hidden"
      aria-labelledby="recent-inboxes-title"
    >
      <div className="flex items-center justify-between gap-4 border-b border-hairline/45 px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex items-center gap-3 font-mono-tabular text-[12px] uppercase tracking-[0.24em] text-muted-foreground">
          <Clock3 className="size-4" aria-hidden />
          <h2 id="recent-inboxes-title">Recent inboxes</h2>
        </div>
        {panelState.savedCountLabel ? (
          <span className="font-mono-tabular text-sm text-signal">
            {panelState.savedCountLabel}
          </span>
        ) : null}
      </div>

      {panelState.kind === "empty" ? (
        <EmptyRecentInboxes />
      ) : (
        <div className="grid min-h-0 flex-1 content-start gap-3 p-3.5 sm:p-4">
          <div className="grid gap-2.5">
            {panelState.rows.map((row) => {
              const selected = row.id === selectedInboxId;
              return (
                <div
                  key={row.id}
                  className={cn(
                    "grid gap-3 rounded-xl border p-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
                    selected
                      ? "border-signal/35 bg-signal/10 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--signal)_22%,transparent)]"
                      : "border-hairline/45 bg-background/20",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-lg border",
                        row.expired
                          ? "border-destructive/30 bg-destructive/12 text-destructive"
                          : "border-signal/18 bg-signal/10 text-signal",
                      )}
                    >
                      <MailProviderIcon className="size-[18px]" />
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

                  <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
                    <span
                      className={cn(
                        "rounded-sm border px-3 py-1 font-mono-tabular text-sm",
                        row.expired
                          ? "border-destructive/22 bg-destructive/10 text-destructive"
                          : row.messageBadgeLabel === "0 new"
                            ? "border-hairline/55 bg-muted/22 text-muted-foreground"
                            : "border-signal/18 bg-signal/10 text-signal",
                      )}
                    >
                      {row.expired ? "Expired" : row.messageBadgeLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpen(row.id)}
                      className="inline-flex h-10 items-center justify-center gap-2.5 rounded-lg border border-signal/28 bg-transparent px-4 text-sm font-semibold text-foreground transition-colors hover:border-signal/65 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      Open
                      <ArrowRight className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingForgetId(row.id)}
                      aria-label={row.forgetLabel}
                      className="inline-flex size-10 items-center justify-center rounded-lg border border-hairline/55 bg-background/24 text-muted-foreground transition-colors hover:border-destructive/35 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl bg-background/22 p-3 text-sm leading-relaxed text-muted-foreground">
            <Sparkles className="mr-3 inline size-4 text-signal" aria-hidden />
            Continue verification with links or one-time codes. Open an inbox to view messages and
            complete your signups.
          </div>
        </div>
      )}

      <AlertDialog
        open={pendingForgetId !== null}
        onOpenChange={(open) => !open && setPendingForgetId(null)}
      >
        <AlertDialogContent className="panel corner-ticks w-[min(92vw,480px)] border-hairline bg-surface-raised text-foreground shadow-panel">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono-tabular text-sm uppercase tracking-[0.18em]">
              Forget this inbox?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              This removes local access to this inbox from this browser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel className="mt-0 border-hairline bg-background/60 font-mono-tabular text-xs uppercase tracking-wider text-foreground hover:border-signal/40 hover:text-signal focus-visible:ring-2 focus-visible:ring-ring/60">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingForgetRow) {
                  onForget(pendingForgetRow.id);
                }
                setPendingForgetId(null);
              }}
              className="bg-destructive font-mono-tabular text-xs uppercase tracking-wider text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              Forget inbox
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
