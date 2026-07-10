"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BreakdownEditor } from "@/components/tasks/breakdown-editor";
import { EnergyTagSelect } from "@/components/tasks/energy-tag-select";
import { useTask } from "@/components/tasks/use-task";
import { Button } from "@/components/ui/button";
import {
  AUTOSAVE_DEBOUNCE_MS,
  useAutosaveStatus,
  useDebouncedCallback,
} from "@/lib/hooks/use-autosave";
import { getBrowserStorage } from "@/lib/storage/browser";
import {
  archiveTask,
  getStepProgressLabel,
  markTaskComplete,
  updateTaskEnergy,
  updateTaskMotivation,
  updateTaskTitle,
} from "@/lib/tasks/task-actions";
import type { EnergyLevel, Task } from "@/lib/types";

function cloneTask(task: Task): Task {
  return {
    ...task,
    steps: task.steps.map((step) => ({ ...step })),
  };
}

interface TaskDetailViewProps {
  taskId: string;
}

export function TaskDetailView({ taskId }: Readonly<TaskDetailViewProps>) {
  const router = useRouter();
  const { task: storedTask, hasLoaded } = useTask(taskId);
  const [localTask, setLocalTask] = useState<Task | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useAutosaveStatus();
  const baselineRef = useRef<Task | null>(null);
  const draft = localTask ?? storedTask ?? null;

  useEffect(() => {
    if (hasLoaded && storedTask && baselineRef.current === null) {
      baselineRef.current = cloneTask(storedTask);
    }
  }, [hasLoaded, storedTask]);

  const persistTask = useDebouncedCallback((task: Task) => {
    getBrowserStorage().upsertTask(task);
    setAutosaveStatus("saved");
  }, AUTOSAVE_DEBOUNCE_MS);

  function updateDraft(nextTask: Task) {
    setLocalTask(nextTask);
    setAutosaveStatus("saving");
    persistTask(nextTask);
  }

  function flushDraft(nextTask: Task) {
    setLocalTask(nextTask);
    setAutosaveStatus("saving");
    persistTask.cancel();
    getBrowserStorage().upsertTask(nextTask);
    setAutosaveStatus("saved");
  }

  function cancelEdits() {
    persistTask.cancel();
    const baseline = baselineRef.current;
    if (baseline) {
      getBrowserStorage().upsertTask(baseline);
    }
    setLocalTask(null);
    setAutosaveStatus("idle");
    router.push("/");
  }

  if (!hasLoaded) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <p className="text-base text-foreground-muted">Loading task…</p>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Task not found</h1>
        <p className="text-sm text-foreground-muted">
          This task may have been removed.
        </p>
        <Button href="/" variant="secondary" className="w-fit">
          Back to Home
        </Button>
      </div>
    );
  }

  const progressLabel = getStepProgressLabel(draft);
  const isActive = draft.status === "active";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold leading-8 text-foreground">
            Task detail
          </h1>
          <p
            aria-live="polite"
            className="text-sm text-foreground-subtle"
          >
            {autosaveStatus === "saving"
              ? "Saving…"
              : autosaveStatus === "saved"
                ? "Saved"
                : ""}
          </p>
        </div>
        <p className="text-sm text-foreground-muted">
          Big tasks are hard to start. Want to split this into tiny steps?
        </p>
      </header>

      <section aria-label="Task details" className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="task-title" className="text-sm font-medium text-foreground">
            Title
          </label>
          <input
            id="task-title"
            type="text"
            value={draft.title}
            onChange={(event) =>
              updateDraft(updateTaskTitle(draft, event.target.value))
            }
            onBlur={(event) =>
              flushDraft(updateTaskTitle(draft, event.target.value))
            }
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="task-motivation"
            className="text-sm font-medium text-foreground"
          >
            Why does this matter to me?
          </label>
          <textarea
            id="task-motivation"
            value={draft.motivation ?? ""}
            onChange={(event) =>
              updateDraft(updateTaskMotivation(draft, event.target.value))
            }
            onBlur={(event) =>
              flushDraft(updateTaskMotivation(draft, event.target.value))
            }
            rows={3}
            placeholder="Optional — reconnect to why you care."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-foreground placeholder:text-foreground-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <EnergyTagSelect
          id="task-energy"
          value={draft.energy}
          onChange={(energy: EnergyLevel | undefined) =>
            updateDraft(updateTaskEnergy(draft, energy))
          }
        />

        {progressLabel ? (
          <p className="text-sm font-medium text-foreground-muted">
            {progressLabel}
          </p>
        ) : null}

        <BreakdownEditor task={draft} onChange={updateDraft} />
      </section>

      <section aria-label="Task actions" className="flex flex-col gap-3 sm:flex-row">
        {isActive ? (
          <Button href={`/focus/${draft.id}`} className="w-full sm:w-auto">
            Start focus
          </Button>
        ) : null}
        {isActive ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => updateDraft(markTaskComplete(draft))}
          >
            Mark complete
          </Button>
        ) : null}
        {draft.status !== "archived" ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={() => updateDraft(archiveTask(draft))}
          >
            Archive
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="w-full sm:w-auto"
          onClick={cancelEdits}
        >
          Cancel
        </Button>
      </section>
    </div>
  );
}
