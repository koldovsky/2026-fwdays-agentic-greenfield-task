import type { Task, TaskStep } from "@/lib/types";
import { createId } from "@/lib/storage/index";

export const MAX_STEPS = 7;

export function sortedSteps(steps: TaskStep[]): TaskStep[] {
  return [...steps].sort((left, right) => left.order - right.order);
}

export function addStep(task: Task, title: string): Task {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("Step title is required");
  }

  if (task.steps.length >= MAX_STEPS) {
    throw new Error("A task can have at most 7 steps");
  }

  const step: TaskStep = {
    id: createId("step"),
    title: trimmed,
    completed: false,
    order: task.steps.length,
  };

  return {
    ...task,
    steps: [...task.steps, step],
  };
}

export function deleteStep(task: Task, stepId: string): Task {
  const steps = sortedSteps(task.steps)
    .filter((step) => step.id !== stepId)
    .map((step, index) => ({ ...step, order: index }));

  return { ...task, steps };
}

export function reorderStep(
  task: Task,
  stepId: string,
  direction: "up" | "down",
): Task {
  const steps = sortedSteps(task.steps);
  const index = steps.findIndex((step) => step.id === stepId);

  if (index === -1) {
    return task;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= steps.length) {
    return task;
  }

  const nextSteps = [...steps];
  [nextSteps[index], nextSteps[targetIndex]] = [
    nextSteps[targetIndex],
    nextSteps[index],
  ];

  return {
    ...task,
    steps: nextSteps.map((step, order) => ({ ...step, order })),
  };
}

export function toggleStepComplete(task: Task, stepId: string): Task {
  return {
    ...task,
    steps: task.steps.map((step) =>
      step.id === stepId ? { ...step, completed: !step.completed } : step,
    ),
  };
}

export function updateStepTitle(
  task: Task,
  stepId: string,
  title: string,
): Task {
  return {
    ...task,
    steps: task.steps.map((step) =>
      step.id === stepId ? { ...step, title } : step,
    ),
  };
}
