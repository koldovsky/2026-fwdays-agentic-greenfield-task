import type { ReactNode } from "react";
import type { ProviderId } from "@/types/inbox";
import { cn } from "@/lib/utils";
import { Check, Mail, Radio } from "lucide-react";

interface Provider {
  id: ProviderId | "temp-mail" | "guerrilla-mail";
  name: string;
  description: string;
  badge: string;
  available: boolean;
  icon: ReactNode;
}

const PROVIDERS: Provider[] = [
  {
    id: "emailnator",
    name: "Emailnator",
    description: "Fast, reliable, and ready to use.",
    badge: "Online",
    available: true,
    icon: <Mail className="size-6" />,
  },
  {
    id: "temp-mail",
    name: "Temp-Mail",
    description: "Rotating aliases across many domains.",
    badge: "Coming soon",
    available: false,
    icon: <Mail className="size-6" />,
  },
  {
    id: "guerrilla-mail",
    name: "Guerrilla Mail",
    description: "Long-lived throwaway inboxes.",
    badge: "Planned",
    available: false,
    icon: <span className="font-mono-tabular text-base font-semibold">GM</span>,
  },
];

interface Props {
  value: ProviderId;
  onChange: (id: ProviderId) => void;
}

export function ProviderSelector({ value, onChange }: Props) {
  return (
    <div className="grid gap-3">
      <div className="font-mono-tabular text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
        Choose provider
      </div>
      <div role="radiogroup" aria-label="Choose provider" className="grid gap-2.5">
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
                "group relative flex min-h-[74px] items-center gap-4 rounded-md border px-3.5 py-3 text-left transition-all",
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
                  "grid size-12 shrink-0 place-items-center rounded-md border transition-colors",
                  selected
                    ? "border-signal/45 bg-signal/20 text-signal shadow-[0_0_26px_-14px_var(--signal)]"
                    : "border-hairline bg-muted/40 text-muted-foreground",
                )}
              >
                {provider.icon}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2.5">
                  <span className="text-base font-semibold text-foreground">{provider.name}</span>
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
                <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                  {provider.description}
                </span>
              </span>

              <span
                aria-hidden
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border",
                  selected
                    ? "border-signal bg-signal text-primary-foreground"
                    : "border-muted-foreground/45 text-muted-foreground",
                )}
              >
                {selected ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : (
                  <Radio className="size-3.5" />
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
