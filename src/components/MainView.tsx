import type { Settings } from "@/lib/types";
import { elapsedFraction, formatRemaining, remainingMs } from "@/lib/ring/ring";
import { BreathingRing, type RingState } from "./BreathingRing";

interface MainViewProps {
  settings: Settings;
  /** Current time, or `null` before the client has mounted. */
  now: Date | null;
  nextReminder: Date | null;
  firstRun: boolean;
}

/** The main "next break" view: the breathing ring plus a first-run welcome line. */
// fallow-ignore-next-line complexity -- Small UI state mapper; CRAP is estimated without coverage.
export function MainView({ settings, now, nextReminder, firstRun }: MainViewProps) {
  let state: RingState = "idle";
  let label = "—";
  let caption: string | undefined = "until your next break";

  if (!settings.enabled) {
    // Reminders explicitly turned off by the user.
    state = "disabled";
    label = "Off";
    caption = "Reminders are off";
  } else if (now && nextReminder) {
    const remaining = remainingMs(now, nextReminder);
    if (remaining <= 0) {
      state = "due";
      label = "0:00";
      caption = "Time for a break";
    } else {
      label = formatRemaining(remaining);
    }
  }
  // else: enabled but not yet mounted (SSR / first paint) — show the calm idle
  // placeholder ("—") rather than a misleading "Off".

  const fraction =
    now && nextReminder && settings.enabled
      ? elapsedFraction(now, nextReminder, settings.intervalMinutes)
      : 0;

  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-10">
      <BreathingRing fraction={fraction} state={state} label={label} caption={caption} />
      {firstRun ? (
        <p className="max-w-xs text-center text-sm leading-relaxed text-muted">
          Welcome. Pause will gently remind you to step away while you work. Adjust
          the rhythm any time in Settings.
        </p>
      ) : null}
    </section>
  );
}
