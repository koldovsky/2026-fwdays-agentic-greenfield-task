import { useMemo, useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, MoreVertical, Plus, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecentInboxRecord } from "@/types/inbox";

interface Props {
  session: RecentInboxRecord;
  onRefresh: () => void;
  onForget: () => void;
  onClose: () => void;
  onGenerateNew: () => void;
  refreshing?: boolean;
  removing?: boolean;
}

const secondaryButtonClass =
  "inline-flex h-12 min-w-12 items-center justify-center gap-3 rounded-md border border-hairline bg-background/30 px-5 text-sm font-medium text-foreground transition-colors hover:border-signal/45 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-65";

function formatOpenedTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatExpiresIn(iso: string): string {
  const diffMs = Date.parse(iso) - Date.now();
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return "Expired";
  }

  const minutes = Math.max(1, Math.round(diffMs / 60_000));
  if (minutes < 60) {
    return `Expires in ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  }

  const hours = Math.round(minutes / 60);
  return `Expires in ${hours} ${hours === 1 ? "hour" : "hours"}`;
}

export function EmailAddressCard({
  session,
  onRefresh,
  onForget,
  onClose,
  onGenerateNew,
  refreshing,
  removing,
}: Props) {
  const [confirmForgetOpen, setConfirmForgetOpen] = useState(false);
  const expiresLabel = useMemo(() => formatExpiresIn(session.expiresAt), [session.expiresAt]);

  return (
    <div className="panel relative overflow-hidden">
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="font-mono-tabular text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            INBOX / LIVE / EMAILNATOR
          </div>
          <div className="mt-2 min-w-0 truncate font-mono-tabular text-2xl font-semibold tracking-tight text-foreground">
            {session.address}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>Opened {formatOpenedTime(session.createdAt)}</span>
            <span aria-hidden>/</span>
            <span className={expiresLabel === "Expired" ? "text-destructive" : "text-signal"}>
              {expiresLabel}
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-3 lg:justify-end">
          <CopyButton
            value={session.address}
            label="Copy address"
            successMessage="Inbox address copied"
            className="h-12 border-signal/45 bg-signal/10 px-5 text-base font-semibold text-signal hover:border-signal/70 hover:bg-signal/15"
          />
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing || removing}
            className={secondaryButtonClass}
          >
            <RefreshCw className={cn("size-5", refreshing && "animate-spin")} aria-hidden />
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={onGenerateNew}
            disabled={removing}
            className={secondaryButtonClass}
          >
            <Plus className="size-5" aria-hidden /> New inbox
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={removing}
                aria-label="More inbox actions"
                className="inline-flex h-12 min-w-12 items-center justify-center rounded-md border border-hairline bg-background/30 text-foreground transition-colors hover:border-signal/45 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-65"
              >
                <MoreVertical className="size-5" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="border-hairline bg-surface-raised text-foreground"
            >
              <DropdownMenuItem onSelect={onRefresh} disabled={refreshing || removing}>
                <RefreshCw className="size-4" aria-hidden /> Refresh inbox
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  setConfirmForgetOpen(true);
                }}
                disabled={removing}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" aria-hidden /> {removing ? "Forgetting" : "Forget inbox"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 items-center gap-3 rounded-md border border-transparent bg-transparent px-4 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70"
          >
            <ArrowLeft className="size-5" aria-hidden /> Back to control panel
          </button>
        </div>
      </div>

      <AlertDialog open={confirmForgetOpen} onOpenChange={setConfirmForgetOpen}>
        <AlertDialogContent className="panel corner-ticks w-[min(92vw,480px)] border-hairline bg-surface-raised text-foreground shadow-panel">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono-tabular text-sm uppercase tracking-[0.18em]">
              Forget local access?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
              This removes this inbox from recent inboxes in this browser and attempts server
              cleanup. It cannot promise provider-side deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel className="mt-0 border-hairline bg-background/60 font-mono-tabular text-xs uppercase tracking-wider text-foreground hover:border-signal/40 hover:text-signal focus-visible:ring-2 focus-visible:ring-ring/60">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onForget}
              className="bg-destructive font-mono-tabular text-xs uppercase tracking-wider text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              Forget local access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
