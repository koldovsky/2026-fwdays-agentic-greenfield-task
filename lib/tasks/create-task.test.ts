import { describe, expect, it } from "vitest";

import { createTask, isEnergyLevel } from "@/lib/tasks/create-task";

describe("createTask", () => {
  it("creates an active task with a trimmed title", () => {
    const task = createTask(
      { title: "  Reply to email  ", energy: "low" },
      new Date("2026-07-10T10:00:00.000Z"),
    );

    expect(task.title).toBe("Reply to email");
    expect(task.energy).toBe("low");
    expect(task.status).toBe("active");
    expect(task.steps).toEqual([]);
  });

  it("rejects empty titles", () => {
    expect(() => createTask({ title: "   " })).toThrow("Task title is required");
  });

  it("validates energy tags", () => {
    expect(isEnergyLevel("medium")).toBe(true);
    expect(isEnergyLevel("urgent")).toBe(false);

    expect(() =>
      createTask({ title: "Task", energy: "urgent" as "low" }),
    ).toThrow("Invalid energy level");
  });
});
