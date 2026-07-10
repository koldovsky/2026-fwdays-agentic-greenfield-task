import type { Task } from "@/lib/types";
import { sortedSteps } from "@/lib/tasks/steps";

const CELEBRATION_COPY = [
  "You showed up. That counts.",
  "5 minutes counts.",
  "Nice work. That was enough for now.",
] as const;

export function areAllStepsComplete(task: Task): boolean {
  const steps = sortedSteps(task.steps);
  return steps.length > 0 && steps.every((step) => step.completed);
}

export function getCelebrationCopy(sessionId: string): string {
  const index =
    sessionId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    CELEBRATION_COPY.length;

  return CELEBRATION_COPY[index];
}

export function formatFocusedDuration(minutes: number): string {
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}
