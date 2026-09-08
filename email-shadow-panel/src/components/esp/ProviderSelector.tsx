import type { ProviderId } from "@/types/inbox";
import { Check, Radio } from "lucide-react";
import { MailProviderIcon } from "./AppLogo";
import { cn } from "@/lib/utils";
import { PROVIDERS } from "@/lib/providerCatalog";

interface Props {
  value: ProviderId;
  onChange: (id: ProviderId) => void;
}

export function ProviderSelector({ value, onChange }: Props) {
  return (
    <div className="grid gap-2.5">
      <div className="font-mono-tabular text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
        Choose provider
      </div>
      <div role="radiogroup" aria-label="Choose provider" className="grid gap-2">
        {PROVIDERS.map((provider) => {
          const selected = provider.available && provider.id === value;
          return (
            <button
              key={provider.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={!provider.available}
              disabled={!provider.available}
              onClick={() => provider.available && onChange(provider.id as ProviderId)}
              className={cn(
                "group relative flex min-h-[62px] items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                selected
                  ? "border-signal/65 bg-signal/10 shadow-[0_0_0_1px_color-mix(in_oklab,var(--signal)_18%,transparent),0_18px_48px_-28px_var(--signal)]"
                  : "border-hairline bg-surface/45 hover:border-signal/35 hover:bg-surface-raised/80",
                !provider.available &&
                  "cursor-not-allowed opacity-55 hover:border-hairline hover:bg-surface/45",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-lg border transition-colors",
                  selected
                    ? "border-signal/45 bg-signal/20 text-signal shadow-[0_0_24px_-14px_var(--signal)]"
                    : "border-hairline bg-muted/40 text-muted-foreground",
                )}
              >
                <MailProviderIcon className="size-[18px]" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.98rem] font-semibold text-foreground sm:text-[1.04rem]">
                    {provider.name}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono-tabular text-[10px] tracking-[0.08em]",
                      selected
                        ? "border-signal/25 bg-signal/10 text-signal"
                        : "border-hairline bg-background/40 text-muted-foreground",
                    )}
                  >
                    {selected ? <span className="size-1.5 rounded-full bg-signal" /> : null}
                    {provider.badge}
                  </span>
                </span>
                <span className="mt-0.5 block text-[0.92rem] leading-relaxed text-muted-foreground">
                  {provider.description}
                </span>
              </span>

              <span
                aria-hidden
                className={cn(
                  "grid size-[22px] shrink-0 place-items-center rounded-full border",
                  selected
                    ? "border-signal bg-signal text-primary-foreground"
                    : "border-muted-foreground/45 text-muted-foreground",
                )}
              >
                {selected ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : (
                  <Radio className="size-3" />
                )}
              </span>
              {!provider.available ? <span className="sr-only">Unavailable</span> : null}
            </button>
          );
        })}
      </div>
      <div className="sr-only" aria-live="polite">
        Emailnator provider selected and online.
      </div>
    </div>
  );
}
