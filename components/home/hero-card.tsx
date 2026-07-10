import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/types";
import {
  getFirstIncompleteStepTitle,
  getStepProgressLabel,
} from "@/lib/tasks/task-actions";

interface HeroCardProps {
  task: Task;
  onSnooze: (task: Task) => void;
}

export function HeroCard({ task, onSnooze }: HeroCardProps) {
  const stepPreview = getFirstIncompleteStepTitle(task);

  return (
    <article className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">{task.title}</h2>

      {stepPreview ? (
        <p className="mt-2 text-sm text-foreground-muted">
          First step: {stepPreview}
        </p>
      ) : null}

      {getStepProgressLabel(task) ? (
        <p className="mt-1 text-sm font-medium text-foreground-muted">
          {getStepProgressLabel(task)}
        </p>
      ) : null}

      {task.motivation ? (
        <p className="mt-3 text-sm italic text-foreground-muted">
          {task.motivation}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        <Button href={`/focus/${task.id}`} className="w-full sm:w-auto">
          Start focus
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            href={`/tasks/${task.id}`}
            variant="secondary"
            className="w-full sm:flex-1"
          >
            Break down
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:flex-1"
            onClick={() => onSnooze(task)}
          >
            Not today
          </Button>
        </div>
      </div>
    </article>
  );
}
