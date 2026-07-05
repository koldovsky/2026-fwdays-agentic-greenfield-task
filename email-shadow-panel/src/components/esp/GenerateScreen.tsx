import { useMemo, useState } from "react";
import { ProviderSelector } from "./ProviderSelector";
import { GenerateButton } from "./GenerateButton";
import { SelectedEmailAnimation } from "./SelectedEmailAnimation";
import { RecentSessions } from "./RecentSessions";
import type { InboxSession, ProviderId } from "@/types/inbox";
import { Radio, ShieldAlert, Zap } from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

interface Props {
  onGenerate: (providerId: ProviderId) => void | Promise<void>;
  onResume: (session: InboxSession) => void;
  isTransitioning: boolean;
}

const HANDOFF_STEPS = [
  "Mint a disposable alias",
  "Open the mailbox stream",
  "Detect verification codes",
] as const;

function ShortcutHint({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-sm border border-hairline bg-background/35 px-2.5 py-1.5 font-mono-tabular text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
      <kbd className="text-signal">{keys}</kbd>
      {label}
    </span>
  );
}

export function GenerateScreen({ onGenerate, onResume, isTransitioning }: Props) {
  const [provider, setProvider] = useState<ProviderId>("emailnator");

  const shortcuts = useMemo(
    () => ({
      g: () => !isTransitioning && onGenerate(provider),
      n: () => !isTransitioning && onGenerate(provider),
    }),
    [isTransitioning, onGenerate, provider],
  );
  useKeyboardShortcuts(shortcuts);

  return (
    <section
      className={`mx-auto max-w-[1400px] px-5 pt-4 pb-16 sm:px-8 ${isTransitioning ? "warp-out" : "fade-up"}`}
    >
      <div className="grid items-stretch gap-8 md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] md:gap-10">
        <div className="panel corner-ticks relative overflow-hidden">
          <div className="p-5 sm:p-7 lg:p-9">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-mono-tabular text-[10px] uppercase tracking-[0.28em] text-signal">
                &gt; generate_inbox
                <span className="cursor-blink" />
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-signal/30 bg-signal/10 px-2 py-1 font-mono-tabular text-[10px] uppercase tracking-[0.18em] text-signal">
                <Radio className="size-3" /> emailnator online
              </span>
            </div>

            <h1 className="mt-4 text-3xl leading-[1.05] tracking-tight text-foreground sm:text-4xl">
              Open a temporary
              <br />
              <span className="text-signal">mailbox channel.</span>
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Generate a disposable address, watch the inbox come online, and copy detected
              verification codes without leaving the panel. This frontend uses mock provider data
              and is ready for a backend adapter later.
            </p>

            <div className="mt-7 grid gap-5">
              <ProviderSelector value={provider} onChange={setProvider} />

              <div className="panel-inset p-3.5">
                <div className="mb-3 flex items-center gap-2 font-mono-tabular text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  <Zap className="size-3.5 text-amber" /> Handoff sequence
                </div>
                <ol className="grid gap-2 sm:grid-cols-3">
                  {HANDOFF_STEPS.map((step, index) => (
                    <li
                      key={step}
                      className="rounded-sm border border-hairline bg-surface/45 px-3 py-2"
                    >
                      <div className="font-mono-tabular text-[10px] uppercase tracking-[0.18em] text-signal/80">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div className="mt-1 text-xs text-foreground/85">{step}</div>
                    </li>
                  ))}
                </ol>
              </div>

              <GenerateButton onClick={() => onGenerate(provider)} loading={isTransitioning} />

              <div className="flex flex-wrap gap-2">
                <ShortcutHint keys="G / N" label="generate" />
                <ShortcutHint keys="Esc" label="back from mailbox" />
              </div>

              <p className="flex items-start gap-2 font-mono-tabular text-[11px] leading-relaxed text-muted-foreground/80">
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-amber" />
                Frontend prototype. Real provider automation belongs in a backend adapter, never in
                this UI.
              </p>
            </div>

            <div className="mt-7">
              <RecentSessions onResume={onResume} />
            </div>
          </div>
        </div>

        <div className="panel corner-ticks relative min-h-[440px] overflow-hidden md:min-h-[560px]">
          <SelectedEmailAnimation activating={isTransitioning} />
          <div aria-hidden className="pointer-events-none absolute inset-0 esp-panel-scanline" />
        </div>
      </div>
    </section>
  );
}
