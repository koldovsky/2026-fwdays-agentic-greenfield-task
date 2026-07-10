import type { EnergyLevel, Task } from "@/lib/types";

import { sortedSteps } from "@/lib/tasks/steps";

export function updateTaskTitle(task: Task, title: string): Task {
  if (!title.trim()) {
    throw new Error("Task title is required");
  }

  return { ...task, title };
}

export function updateTaskMotivation(task: Task, motivation: string): Task {
  return {
    ...task,
    motivation: motivation.trim() ? motivation : undefined,
  };
}

export function updateTaskEnergy(
  task: Task,
  energy: EnergyLevel | undefined,
): Task {
  return {
    ...task,
    energy,
  };
}

export function markTaskComplete(task: Task, now = new Date()): Task {
  return {
    ...task,
    status: "completed",
    completedAt: now.toISOString(),
  };
}

export function archiveTask(task: Task): Task {
  return {
    ...task,
    status: "archived",
  };
}

export function getStepProgressLabel(task: Task): string | null {
  const steps = sortedSteps(task.steps);
  if (steps.length === 0) {
    return null;
  }

  const firstIncompleteIndex = steps.findIndex((step) => !step.completed);
  const currentStep =
    firstIncompleteIndex === -1
      ? steps.length
      : firstIncompleteIndex + 1;

  return `Step ${currentStep} of ${steps.length}`;
}

export function getFirstIncompleteStepTitle(task: Task): string | null {
  const steps = sortedSteps(task.steps);
  const firstIncomplete = steps.find((step) => !step.completed);
  return firstIncomplete?.title ?? null;
}
