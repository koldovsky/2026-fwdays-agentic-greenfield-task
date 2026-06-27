interface DueBreakCardProps {
  snoozeMinutes: number;
  onDone: () => void;
  onSnooze: () => void;
}

/**
 * The in-app due-break nudge — the one warm moment, so it carries the `signal`
 * color (DESIGN.md). It is the source of truth for the two actions; the
 * Notification only mirrors it (FR-NOTIFY-02, FR-NOTIFY-04).
 */
export function DueBreakCard({ snoozeMinutes, onDone, onSnooze }: DueBreakCardProps) {
  return (
    <div
      role="alertdialog"
      aria-label="Time for a break"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-10 flex justify-center px-4"
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-signal/30 bg-surface p-5 shadow-lg">
        <p className="font-display text-lg text-ink">Time for a break</p>
        <p className="mt-1 text-sm text-muted">
          Step away for a moment — your eyes and shoulders will thank you.
        </p>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onDone}
            className="flex-1 rounded-full bg-signal px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2"
          >
            Took a break
          </button>
          <button
            type="button"
            onClick={onSnooze}
            className="rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Snooze {snoozeMinutes} min
          </button>
        </div>
      </div>
    </div>
  );
}
