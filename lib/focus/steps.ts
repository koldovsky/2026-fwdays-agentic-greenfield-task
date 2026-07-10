import { SHRINK_MINUTES } from "@/lib/focus/constants";
import type { FocusSession, Task, TaskStep } from "@/lib/types";
import { createId } from "@/lib/storage/index";
import { sortedSteps, toggleStepComplete } from "@/lib/tasks/steps";

export function getInitialStepId(task: Task): string | undefined {
  const steps = sortedSteps(task.steps);
  const firstIncomplete = steps.find((step) => !step.completed);
  return firstIncomplete?.id ?? steps[0]?.id;
}

export function getCurrentStep(
  task: Task,
  stepId?: string,
): TaskStep | undefined {
  const steps = sortedSteps(task.steps);
  if (steps.length === 0) {
    return undefined;
  }

  if (stepId) {
    return steps.find((step) => step.id === stepId) ?? steps[0];
  }

  return steps.find((step) => !step.completed) ?? steps[0];
}

export function getStepPositionLabel(task: Task, stepId?: string): string | null {
  const steps = sortedSteps(task.steps);
  if (steps.length === 0) {
    return null;
  }

  const current = getCurrentStep(task, stepId);
  if (!current) {
    return null;
  }

  const index = steps.findIndex((step) => step.id === current.id);
  return `Step ${index + 1} of ${steps.length}`;
}

export function createFocusSession(
  taskId: string,
  plannedMinutes: number,
  stepId: string | undefined,
  now = new Date(),
): FocusSession {
  return {
    id: createId("session"),
    taskId,
    stepId,
    plannedMinutes,
    startedAt: now.toISOString(),
    pausedMs: 0,
    status: "active",
  };
}

export function shrinkSession(
  session: FocusSession,
  task: Task,
  now = new Date(),
): FocusSession {
  const steps = sortedSteps(task.steps);
  const firstStep = steps.find((step) => !step.completed) ?? steps[0];

  return {
    ...session,
    plannedMinutes: SHRINK_MINUTES,
    stepId: firstStep?.id,
    startedAt: now.toISOString(),
    pausedMs: 0,
    pausedAt: undefined,
    endedAt: undefined,
    status: "active",
  };
}

export function advanceTaskStep(
  task: Task,
  stepId: string,
): { task: Task; nextStepId?: string } {
  const updatedTask = toggleStepComplete(task, stepId);
  const nextStep = sortedSteps(updatedTask.steps).find((step) => !step.completed);

  return {
    task: updatedTask,
    nextStepId: nextStep?.id,
  };
}
