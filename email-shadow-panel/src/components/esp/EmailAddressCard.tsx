import { CopyButton } from "./CopyButton";
import { RefreshCw, X, Radio, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InboxSession } from "@/types/inbox";

interface Props {
  session: InboxSession;
  onRefresh: () => void;
  onClose: () => void;
  onGenerateNew: () => void;
  refreshing?: boolean;
}

export function EmailAddressCard({
  session,
  onRefresh,
  onClose,
  onGenerateNew,
  refreshing,
}: Props) {
  return (
    <div className="panel corner-ticks relative overflow-hidden">
      <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono-tabular text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              &gt; inbox
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono-tabular text-[10px] uppercase tracking-[0.22em] text-signal">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-70" />
                <span className="relative inline-flex size-1.5 rounded-full bg-signal" />
              </span>
              live / emailnator
            </span>
          </div>
          <div className="mt-2 flex min-w-0 items-baseline gap-1">
            <span className="truncate font-mono-tabular text-xl text-foreground sm:text-2xl">
              {session.address}
            </span>
            <span className="cursor-blink shrink-0" />
          </div>
          <div className="mt-1.5 font-mono-tabular text-[11px] text-muted-foreground">
            channel {session.id} / opened {new Date(session.createdAt).toLocaleTimeString()}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <CopyButton
            value={session.address}
            label="Copy address"
            successMessage="Inbox address copied"
          />
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className={cn(
              "inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-md border border-hairline bg-surface-raised px-3 font-mono-tabular text-xs uppercase tracking-wider text-foreground transition-colors",
              "hover:border-signal/40 hover:text-signal",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              "disabled:opacity-70",
            )}
          >
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
            {refreshing ? "Syncing" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={onGenerateNew}
            className={cn(
              "inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-md border border-signal/35 bg-signal/10 px-3 font-mono-tabular text-xs uppercase tracking-wider text-signal transition-colors",
              "hover:border-signal/60 hover:bg-signal/15",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50",
            )}
          >
            <Plus className="size-3.5" /> New inbox
          </button>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-md border border-hairline bg-transparent px-3 font-mono-tabular text-xs uppercase tracking-wider text-muted-foreground transition-colors",
              "hover:border-destructive/50 hover:text-destructive",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            <X className="size-3.5" /> Panel
          </button>
        </div>
      </div>
      <div aria-hidden className="absolute inset-x-0 top-0 h-px esp-signal-line" />
      <Radio aria-hidden className="absolute right-4 top-4 size-4 text-signal/20" />
    </div>
  );
}
