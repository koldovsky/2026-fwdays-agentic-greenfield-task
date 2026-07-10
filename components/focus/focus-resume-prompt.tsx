import { Button } from "@/components/ui/button";
import { formatTimer } from "@/lib/focus/timer";

interface FocusResumePromptProps {
  remainingSeconds: number;
  onResume: () => void;
  onEnd: () => void;
}

export function FocusResumePrompt({
  remainingSeconds,
  onResume,
  onEnd,
}: FocusResumePromptProps) {

  return (
    <section
      aria-label="Resume focus session"
      className="flex w-full max-w-md flex-col items-center gap-6 text-center"
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Paused</h1>
        <p className="text-sm text-foreground-muted">
          Paused. Your progress is saved.
        </p>
      </div>

      <p
        aria-live="polite"
        className="font-mono text-4xl font-semibold text-foreground"
      >
        {formatTimer(remainingSeconds)}
      </p>

      <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Button type="button" onClick={onResume} className="w-full sm:w-auto">
          Resume
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onEnd}
          className="w-full sm:w-auto"
        >
          End session
        </Button>
      </div>
    </section>
  );
}
