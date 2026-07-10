import { describe, expect, it } from "vitest";

import type { Task } from "@/lib/types";
import { snoozeTaskUntilTomorrow } from "@/lib/tasks/snooze-task";

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

describe("snoozeTaskUntilTomorrow", () => {
  it("snoozes until the next local calendar day", () => {
    const snoozed = snoozeTaskUntilTomorrow(
      createTask(),
      new Date("2026-07-10T20:00:00"),
    );

    expect(snoozed.snoozedUntil).toBe("2026-07-11");
  });
});
