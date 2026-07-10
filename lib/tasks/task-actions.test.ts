import { describe, expect, it } from "vitest";

import type { Task } from "@/lib/types";
import { createMemoryStorageAdapter } from "@/lib/storage/adapter";
import { TinyStartStorage } from "@/lib/storage/index";
import { addStep } from "@/lib/tasks/steps";
import {
  archiveTask,
  getStepProgressLabel,
  markTaskComplete,
  updateTaskMotivation,
} from "@/lib/tasks/task-actions";

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

describe("task actions", () => {
  it("persists motivation updates through storage autosave", () => {
    const storage = new TinyStartStorage(createMemoryStorageAdapter());
    const task = createTask();

    storage.upsertTask(task);
    const withMotivation = updateTaskMotivation(
      task,
      "This helps me feel prepared",
    );
    storage.upsertTask(withMotivation);

    expect(storage.getTask(task.id)?.motivation).toBe(
      "This helps me feel prepared",
    );
  });

  it("keeps spaces while editing motivation text", () => {
    const task = createTask();
    let draft = updateTaskMotivation(task, "feel less");
    draft = updateTaskMotivation(draft, "feel less ");
    draft = updateTaskMotivation(draft, "feel less anxious");

    expect(draft.motivation).toBe("feel less anxious");
  });

  it("marks tasks complete and archived", () => {
    const task = createTask();
    const completed = markTaskComplete(
      task,
      new Date("2026-07-10T12:00:00.000Z"),
    );
    const archived = archiveTask(task);

    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toBe("2026-07-10T12:00:00.000Z");
    expect(archived.status).toBe("archived");
  });

  it('shows "Step 1 of N" after breakdown', () => {
    let task = createTask();
    task = addStep(task, "Open doc");
    task = addStep(task, "Write intro");
    task = addStep(task, "Proofread");

    expect(getStepProgressLabel(task)).toBe("Step 1 of 3");
  });
});
