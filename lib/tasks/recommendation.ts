import type { Task } from "@/lib/types";
import { isSnoozed, withExpiredSnoozeCleared } from "@/lib/storage/snooze";
import { sortedSteps } from "@/lib/tasks/steps";

export interface RecommendOptions {
  lastActiveTaskId?: string;
  now?: Date;
}

function getEligibleTasks(tasks: Task[], now: Date): Task[] {
  return tasks
    .filter((task) => task.status === "active")
    .map((task) => withExpiredSnoozeCleared(task, now))
    .filter((task) => !isSnoozed(task, now));
}

function hasIncompleteSteps(task: Task): boolean {
  const steps = sortedSteps(task.steps);
  return steps.length > 0 && steps.some((step) => !step.completed);
}

function sortOldestFirst(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

/** Full FR-HOME-07 priority: last active → incomplete steps → oldest active. */
export function recommendNextTask(
  tasks: Task[],
  options: RecommendOptions = {},
): Task | null {
  const now = options.now ?? new Date();
  const eligible = getEligibleTasks(tasks, now);

  if (eligible.length === 0) {
    return null;
  }

  if (options.lastActiveTaskId) {
    const lastActive = eligible.find(
      (task) => task.id === options.lastActiveTaskId,
    );
    if (lastActive) {
      return lastActive;
    }
  }

  const withIncompleteSteps = sortOldestFirst(
    eligible.filter((task) => hasIncompleteSteps(task)),
  );
  if (withIncompleteSteps.length > 0) {
    return withIncompleteSteps[0];
  }

  return sortOldestFirst(eligible)[0] ?? null;
}

/** Phase 1 fallback — oldest active task not snoozed (branch 3 only). */
export function recommendOldestActiveTask(
  tasks: Task[],
  now = new Date(),
): Task | null {
  const eligible = getEligibleTasks(tasks, now);
  return sortOldestFirst(eligible)[0] ?? null;
}
