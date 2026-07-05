import { useEffect, useMemo, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { ProviderId } from "@/types/inbox";

const BASE_STEPS = [
  { t: 0, label: "creating alias" },
  { t: 140, label: "opening inbox" },
  { t: 300, label: "syncing messages" },
  { t: 460, label: "handoff ready" },
] as const;

interface Props {
  visible: boolean;
  providerId?: ProviderId;
  ready?: boolean;
}

export function TransitionOverlay({ visible, providerId = "emailnator", ready = false }: Props) {
  const [step, setStep] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  const steps = useMemo(
    () =>
      BASE_STEPS.map((item, index) => ({
        ...item,
        label: index === 0 ? `creating ${providerId} alias` : item.label,
      })),
    [providerId],
  );

  useEffect(() => {
    if (!visible) {
      setStep(0);
      return;
    }
    if (reducedMotion) {
      setStep(steps.length);
      return;
    }

    const timers = steps.map((s, i) => setTimeout(() => setStep(i + 1), s.t + 20));
    return () => timers.forEach(clearTimeout);
  }, [reducedMotion, steps, visible]);

  useEffect(() => {
    if (visible && ready) setStep(steps.length);
  }, [ready, steps.length, visible]);

  return (
    <div
      aria-hidden={!visible}
      className={`pointer-events-none fixed inset-0 z-50 grid place-items-center transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="absolute inset-0 esp-transition-scrim" />
      <div className="absolute inset-0 esp-transition-scan" />
      {!reducedMotion && visible && (
        <div className="absolute left-0 right-0 h-20 esp-transition-sweep" />
      )}

      <div className="panel corner-ticks relative w-[min(520px,90vw)] p-6">
        <div className="font-mono-tabular text-[10px] uppercase tracking-[0.28em] text-signal">
          &gt; shadow handoff
          <span className="cursor-blink" />
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          Generating the inbox, then handing it to the mailbox view.
        </div>
        <div className="mt-4 font-mono-tabular text-[12px] leading-[1.7]">
          {steps.map((s, i) => {
            const done = step > i;
            const active = step === i + 1 || (step === 0 && i === 0);
            return (
              <div
                key={s.label}
                className={
                  done ? "text-primary" : active ? "text-signal" : "text-muted-foreground/50"
                }
              >
                <span className="mr-2 text-muted-foreground/40">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {s.label}
                {done ? "  ok" : active ? "  ..." : ""}
              </div>
            );
          })}
        </div>
        <div className="mt-4 font-mono-tabular text-[11px] text-signal/90">
          [{"#".repeat(Math.max(1, step * 6))}
          <span className="text-signal/25">{".".repeat(Math.max(0, 24 - step * 6))}</span>]
        </div>
      </div>
    </div>
  );
}
