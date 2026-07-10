import type { Task } from "@/lib/types";
import { snoozeUntilTomorrow } from "@/lib/storage/snooze";

export function snoozeTaskUntilTomorrow(task: Task, now = new Date()): Task {
  return {
    ...task,
    snoozedUntil: snoozeUntilTomorrow(now),
  };
}
