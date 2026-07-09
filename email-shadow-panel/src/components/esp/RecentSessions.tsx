import type { RecentInboxRecord } from "@/types/inbox";
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
  items: RecentInboxRecord[];
  selectedInboxId?: string | null;
  onSelect?: (id: string) => void;
  actionLabel?: string;
}

export function RecentSessions({ items, selectedInboxId, onSelect, actionLabel = "open" }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="fade-up">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono-tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          <Clock className="size-3" /> Recent inboxes
        </div>
        <span className="font-mono-tabular text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
          browser local
        </span>
      </div>
      <div className="grid gap-1.5">
        {items.map((item) => {
          const selected = item.id === selectedInboxId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect?.(item.id)}
              className={cn(
                "group flex min-h-12 min-w-0 items-center gap-3 rounded-md border px-3 py-2.5 text-left",
                "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                selected
                  ? "border-signal/45 bg-signal/10"
                  : "border-hairline bg-surface/45 hover:border-signal/35 hover:bg-surface-raised",
              )}
            >
              <MailOpen className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-signal" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono-tabular text-[12px] text-foreground">
                  {item.address}
                </div>
                <div className="mt-0.5 break-words font-mono-tabular text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  opened {formatWhen(item.lastOpenedAt)} / expires{" "}
                  {new Date(item.expiresAt).toLocaleTimeString()}
                </div>
              </div>
              <span className="hidden shrink-0 font-mono-tabular text-[10px] uppercase tracking-[0.18em] text-signal/80 sm:inline">
                {selected ? "selected" : actionLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
