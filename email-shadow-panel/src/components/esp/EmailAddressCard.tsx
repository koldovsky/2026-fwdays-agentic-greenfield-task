import type { ReactNode } from "react";
import { CopyButton } from "./CopyButton";
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
import { APP_SHELL_NOTICE } from "@/lib/appShellState";
import { cn } from "@/lib/utils";
import type { RecentInboxRecord } from "@/types/inbox";
import { ArrowLeft, Plus, RefreshCw, Trash2 } from "lucide-react";

interface Props {
  session: RecentInboxRecord;
  onRefresh: () => void;
  onForget: () => void;
  onClose: () => void;
  onGenerateNew: () => void;
  refreshing?: boolean;
  removing?: boolean;
  auxiliaryActions?: ReactNode;
  confirmForgetOpen: boolean;
  onConfirmForgetOpenChange: (open: boolean) => void;
}

const secondaryButtonClass =
  "inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-lg border border-hairline/65 bg-background/24 px-3.5 text-sm font-medium text-foreground transition-colors hover:border-signal/45 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-65";

const dangerButtonClass =
  "inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-lg border border-destructive/22 bg-destructive/10 px-3.5 text-sm font-medium text-destructive transition-colors hover:border-destructive/45 hover:bg-destructive/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-65";

const ghostButtonClass =
  "inline-flex h-10 items-center gap-2 rounded-lg border border-transparent bg-transparent px-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70";

function formatOpenedLabel(iso: string): string {
  const openedAt = new Date(iso);
  if (Number.isNaN(openedAt.getTime())) {
    return "Opened recently";
  }

  const now = new Date();
  const sameDay =
    openedAt.getFullYear() === now.getFullYear() &&
    openedAt.getMonth() === now.getMonth() &&
    openedAt.getDate() === now.getDate();
  const timeLabel = openedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (sameDay) {
    return `Opened today at ${timeLabel}`;
  }

  const dateLabel = openedAt.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: openedAt.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
  return `Opened ${dateLabel} at ${timeLabel}`;
}

export function EmailAddressCard({
  session,
  onRefresh,
  onForget,
  onClose,
  onGenerateNew,
  refreshing,
  removing,
  auxiliaryActions,
  confirmForgetOpen,
  onConfirmForgetOpenChange,
}: Props) {
  return (
    <div className="panel relative overflow-hidden">
      <div className="grid gap-3 px-4 py-3 sm:px-5 sm:py-3.5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 font-mono-tabular text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:text-[12px]">
            <span>Inbox session</span>
            <span aria-hidden>&middot;</span>
            <span>Emailnator</span>
          </div>
          <div className="mt-1 min-w-0 truncate font-mono-tabular text-[clamp(1.18rem,0.52vw+0.98rem,1.78rem)] font-semibold tracking-tight text-foreground">
            {session.address}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[0.88rem] text-muted-foreground">
            <span>{formatOpenedLabel(session.createdAt)}</span>
            <span aria-hidden>&middot;</span>
            <span>{APP_SHELL_NOTICE}</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 xl:justify-end">
          <CopyButton
            value={session.address}
            label="Copy address"
            successMessage="Inbox address copied"
            className="h-10 border-signal/45 bg-signal/10 px-4 text-sm font-semibold text-signal hover:border-signal/70 hover:bg-signal/15"
          />
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing || removing}
            className={secondaryButtonClass}
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} aria-hidden />
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={onGenerateNew}
            disabled={removing}
            className={secondaryButtonClass}
          >
            <Plus className="size-4" aria-hidden /> New inbox
          </button>
          {auxiliaryActions}
          <button
            type="button"
            onClick={() => onConfirmForgetOpenChange(true)}
            disabled={removing}
            className={dangerButtonClass}
          >
            <Trash2 className="size-4" aria-hidden /> {removing ? "Forgetting" : "Forget inbox"}
          </button>
          <button type="button" onClick={onClose} className={ghostButtonClass}>
            <ArrowLeft className="size-4" aria-hidden /> Back to control panel
          </button>
        </div>
      </div>

      <AlertDialog open={confirmForgetOpen} onOpenChange={onConfirmForgetOpenChange}>
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
                onConfirmForgetOpenChange(false);
                onForget();
              }}
              className="bg-destructive font-mono-tabular text-xs uppercase tracking-wider text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              Forget inbox
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
