import type { InboxSession } from "@/types/inbox";
import { loadRecentSessions } from "@/lib/localSessions";
import { useEffect, useState } from "react";
import { Clock, MailOpen } from "lucide-react";
import { cn } from "@/lib/utils";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

interface Props {
  onResume?: (s: InboxSession) => void;
  refreshKey?: number;
}

export function RecentSessions({ onResume, refreshKey }: Props) {
  const [items, setItems] = useState<InboxSession[]>([]);

  useEffect(() => {
    setItems(loadRecentSessions());
  }, [refreshKey]);

  if (items.length === 0) return null;

  return (
    <div className="fade-up">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono-tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          <Clock className="size-3" /> Recent sessions
        </div>
        <span className="font-mono-tabular text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
          local
        </span>
      </div>
      <div className="grid gap-1.5">
        {items.slice(0, 3).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onResume?.(s)}
            className={cn(
              "group flex min-h-12 items-center gap-3 rounded-md border border-hairline bg-surface/45 px-3 py-2.5 text-left",
              "transition-colors hover:border-signal/40 hover:bg-surface-raised",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            <MailOpen className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-signal" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-mono-tabular text-[12px] text-foreground">
                {s.address}
              </div>
              <div className="mt-0.5 font-mono-tabular text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {formatWhen(s.updatedAt ?? s.createdAt)} / {s.messageCount} msg
              </div>
            </div>
            <span className="hidden font-mono-tabular text-[10px] uppercase tracking-[0.18em] text-signal/80 sm:inline">
              resume
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
