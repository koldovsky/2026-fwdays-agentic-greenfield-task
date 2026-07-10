import { describe, expect, it } from "vitest";

import {
  advanceTaskStep,
  getCurrentStep,
  getInitialStepId,
  getStepPositionLabel,
} from "@/lib/focus/steps";
import type { Task } from "@/lib/types";

function createTask(): Task {
  const now = "2026-07-10T10:00:00.000Z";
  return {
    id: "task_1",
    title: "Write report",
    steps: [
      { id: "step_1", title: "Open doc", completed: false, order: 0 },
      { id: "step_2", title: "Draft intro", completed: false, order: 1 },
    ],
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

describe("focus step helpers", () => {
  it("selects the first incomplete step", () => {
    const task = createTask();
    expect(getInitialStepId(task)).toBe("step_1");
    expect(getCurrentStep(task, "step_2")?.title).toBe("Draft intro");
    expect(getStepPositionLabel(task, "step_2")).toBe("Step 2 of 2");
  });

  it("advances to the next incomplete step", () => {
    const result = advanceTaskStep(createTask(), "step_1");

    expect(result.task.steps.find((step) => step.id === "step_1")?.completed).toBe(
      true,
    );
    expect(result.nextStepId).toBe("step_2");
  });
});
