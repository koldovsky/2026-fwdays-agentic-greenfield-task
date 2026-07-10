"use client";

import { useState } from "react";

import {
  MAX_STEPS,
  addStep,
  deleteStep,
  reorderStep,
  sortedSteps,
  toggleStepComplete,
  updateStepTitle,
} from "@/lib/tasks/steps";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/types";

interface BreakdownEditorProps {
  task: Task;
  onChange: (task: Task) => void;
}

export function BreakdownEditor({ task, onChange }: BreakdownEditorProps) {
  const [newStepTitle, setNewStepTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const steps = sortedSteps(task.steps);
  const canAddStep = steps.length < MAX_STEPS;

  function applyChange(nextTask: Task) {
    setError(null);
    onChange(nextTask);
  }

  function handleAddStep() {
    try {
      applyChange(addStep(task, newStepTitle));
      setNewStepTitle("");
    } catch (addError) {
      setError(
        addError instanceof Error ? addError.message : "Could not add step",
      );
    }
  }

  return (
    <section aria-label="Task breakdown" className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Breakdown</h2>
        <p className="text-sm text-foreground-muted">
          Add 3–7 tiny steps to make starting easier.
        </p>
      </div>

      {steps.length > 0 ? (
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface px-3 py-3"
            >
              <div className="flex flex-col gap-1 pt-1">
                <button
                  type="button"
                  aria-label={`Move step ${index + 1} up`}
                  disabled={index === 0}
                  onClick={() => applyChange(reorderStep(task, step.id, "up"))}
                  className="rounded-md px-1 text-foreground-subtle transition-colors duration-150 ease-in-out hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move step ${index + 1} down`}
                  disabled={index === steps.length - 1}
                  onClick={() =>
                    applyChange(reorderStep(task, step.id, "down"))
                  }
                  className="rounded-md px-1 text-foreground-subtle transition-colors duration-150 ease-in-out hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
                >
                  ↓
                </button>
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={step.completed}
                    aria-label={`Mark step ${index + 1} complete: ${step.title}`}
                    onChange={() =>
                      applyChange(toggleStepComplete(task, step.id))
                    }
                    className="size-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <span className="sr-only">{`Step ${index + 1}`}</span>
                </label>

                <input
                  type="text"
                  value={step.title}
                  aria-label={`Step ${index + 1} title`}
                  onChange={(event) =>
                    applyChange(
                      updateStepTitle(task, step.id, event.target.value),
                    )
                  }
                  className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-base text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <button
                type="button"
                aria-label={`Remove step ${index + 1}`}
                onClick={() => applyChange(deleteStep(task, step.id))}
                className="rounded-lg px-2 py-2 text-sm font-medium text-foreground-muted transition-colors duration-150 ease-in-out hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Remove
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-foreground-muted">
          No steps yet. Add your first tiny step below.
        </p>
      )}

      <div className="space-y-3">
        <label htmlFor="new-step-title" className="text-sm font-medium text-foreground">
          New step
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="new-step-title"
            type="text"
            value={newStepTitle}
            onChange={(event) => setNewStepTitle(event.target.value)}
            placeholder="e.g. Open the document"
            disabled={!canAddStep}
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-foreground placeholder:text-foreground-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!canAddStep || !newStepTitle.trim()}
            onClick={handleAddStep}
            className="w-full sm:w-auto"
          >
            Add step
          </Button>
        </div>
        {!canAddStep ? (
          <p className="text-sm text-foreground-muted">
            You&apos;ve reached the 7-step limit for this task.
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-warning">
          {error}
        </p>
      ) : null}
    </section>
  );
}
