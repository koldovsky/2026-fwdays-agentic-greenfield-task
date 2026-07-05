import type { ProviderId } from "@/types/inbox";
import { cn } from "@/lib/utils";
import { Check, Clock3 } from "lucide-react";

interface Provider {
  id: ProviderId | string;
  name: string;
  description: string;
  available: boolean;
}

const PROVIDERS: Provider[] = [
  {
    id: "emailnator",
    name: "Emailnator",
    description: "Disposable Gmail-style addresses",
    available: true,
  },
  {
    id: "temp-mail",
    name: "Temp-Mail",
    description: "Rotating aliases across many domains",
    available: false,
  },
  {
    id: "guerrilla",
    name: "Guerrilla",
    description: "Long-lived throwaway boxes",
    available: false,
  },
];

interface Props {
  value: ProviderId;
  onChange: (id: ProviderId) => void;
}

export function ProviderSelector({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="font-mono-tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Provider
        </label>
        <span className="font-mono-tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">
          {PROVIDERS.filter((p) => p.available).length} active
        </span>
      </div>
      <div role="radiogroup" className="grid gap-2">
        {PROVIDERS.map((p) => {
          const selected = p.available && p.id === value;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!p.available}
              onClick={() => p.available && onChange(p.id as ProviderId)}
              className={cn(
                "group relative flex min-h-14 items-center gap-3 rounded-md border px-3.5 py-3 text-left transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                selected
                  ? "border-signal/50 bg-surface-raised shadow-[0_0_0_1px_color-mix(in_oklab,var(--signal)_25%,transparent),0_10px_30px_-15px_color-mix(in_oklab,var(--signal)_55%,transparent)]"
                  : "border-hairline bg-surface/60 hover:bg-surface-raised",
                !p.available && "cursor-not-allowed opacity-50",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-sm border transition-colors",
                  selected
                    ? "border-signal/60 bg-signal/15 text-signal"
                    : "border-hairline text-muted-foreground/50",
                )}
              >
                {selected ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : (
                  <Clock3 className="size-3" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                  {!p.available && (
                    <span className="font-mono-tabular text-[9px] uppercase tracking-[0.2em] text-muted-foreground/70">
                      coming soon
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {p.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
