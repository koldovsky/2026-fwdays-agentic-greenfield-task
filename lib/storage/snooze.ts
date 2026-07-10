import type { Task } from "@/lib/types";

export function localDateString(date: Date): string {
  return date.toLocaleDateString("en-CA");
}

export function snoozeDateString(date: Date): string {
  return localDateString(date);
}

/** True when the task is still snoozed for the given local calendar day. */
export function isSnoozed(task: Task, now = new Date()): boolean {
  if (!task.snoozedUntil) {
    return false;
  }

  const snoozeDay = task.snoozedUntil.slice(0, 10);
  return localDateString(now) < snoozeDay;
}

/** Returns a copy with expired snooze removed (read-side helper for recommendations). */
export function withExpiredSnoozeCleared(task: Task, now = new Date()): Task {
  if (!task.snoozedUntil || isSnoozed(task, now)) {
    return task;
  }

  return {
    ...task,
    snoozedUntil: undefined,
  };
}

export function snoozeUntilTomorrow(now = new Date()): string {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return snoozeDateString(tomorrow);
}
