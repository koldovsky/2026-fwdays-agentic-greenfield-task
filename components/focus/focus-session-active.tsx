import { Button } from "@/components/ui/button";
import { formatTimer } from "@/lib/focus/timer";
import { getCurrentStep, getStepPositionLabel } from "@/lib/focus/steps";
import type { FocusSession, Task } from "@/lib/types";

interface FocusSessionActiveProps {
  task: Task;
  session: FocusSession;
  remainingSeconds: number;
  onPause: () => void;
  onExtend: () => void;
  onEnd: () => void;
  onShrink: () => void;
  onDoneStep: () => void;
}

export function FocusSessionActive({
  task,
  session,
  remainingSeconds,
  onPause,
  onExtend,
  onEnd,
  onShrink,
  onDoneStep,
}: FocusSessionActiveProps) {
  const currentStep = getCurrentStep(task, session.stepId);
  const stepLabel = getStepPositionLabel(task, session.stepId);
  const displayStep = currentStep?.title ?? task.title;
  const nearEnd = remainingSeconds > 0 && remainingSeconds <= 30;

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-8 px-4 py-8 text-center sm:px-6">
        {stepLabel ? (
          <p className="text-sm text-foreground-muted">{stepLabel}</p>
        ) : null}

        <h1 className="max-w-md text-2xl font-semibold leading-8 text-foreground sm:text-3xl">
          {displayStep}
        </h1>

        <div aria-live="polite" aria-atomic="true" className="space-y-2">
          <p className="sr-only">Time remaining</p>
          <p
            className={`font-mono text-5xl font-semibold leading-none text-foreground ${
              nearEnd ? "motion-safe:animate-pulse motion-reduce:animate-none" : ""
            }`}
          >
            {formatTimer(remainingSeconds)}
          </p>
        </div>

        {currentStep && !currentStep.completed ? (
          <Button type="button" variant="secondary" onClick={onDoneStep}>
            Done with this step
          </Button>
        ) : null}

        <Button type="button" variant="ghost" onClick={onShrink}>
          Too hard? Shrink it
        </Button>
      </div>

      <footer className="border-t border-border px-4 py-4 text-center sm:px-6">
        <p className="truncate text-sm text-foreground-muted">{task.title}</p>
        <div className="mx-auto mt-4 flex max-w-lg flex-col gap-3 sm:flex-row sm:justify-center">
          <Button type="button" variant="secondary" onClick={onPause}>
            Pause
          </Button>
          <Button type="button" variant="secondary" onClick={onExtend}>
            +5 min
          </Button>
          <Button type="button" variant="ghost" onClick={onEnd}>
            End session
          </Button>
        </div>
      </footer>
    </div>
  );
}
