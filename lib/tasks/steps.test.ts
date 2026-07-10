import { describe, expect, it } from "vitest";

import type { Task } from "@/lib/types";
import {
  addStep,
  deleteStep,
  reorderStep,
  toggleStepComplete,
} from "@/lib/tasks/steps";

function createTask(): Task {
  const now = "2026-07-10T10:00:00.000Z";
  return {
    id: "task_1",
    title: "Write report",
    steps: [],
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

describe("task steps", () => {
  it("adds, reorders, completes, and deletes steps", () => {
    let task = createTask();
    task = addStep(task, "Outline");
    task = addStep(task, "Draft");
    task = addStep(task, "Review");

    expect(task.steps).toHaveLength(3);

    const secondStepId = task.steps.find((step) => step.title === "Draft")?.id;
    expect(secondStepId).toBeDefined();

    task = reorderStep(task, secondStepId!, "up");
    expect(task.steps.find((step) => step.order === 0)?.title).toBe("Draft");

    task = toggleStepComplete(task, secondStepId!);
    expect(
      task.steps.find((step) => step.id === secondStepId)?.completed,
    ).toBe(true);

    task = deleteStep(task, secondStepId!);
    expect(task.steps).toHaveLength(2);
  });

  it("rejects more than 7 steps", () => {
    let task = createTask();
    for (let index = 0; index < 7; index += 1) {
      task = addStep(task, `Step ${index + 1}`);
    }

    expect(() => addStep(task, "Step 8")).toThrow(
      "A task can have at most 7 steps",
    );
  });
});
