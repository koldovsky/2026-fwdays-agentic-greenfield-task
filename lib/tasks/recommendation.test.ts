import { describe, expect, it } from "vitest";

import type { Task } from "@/lib/types";
import {
  recommendNextTask,
  recommendOldestActiveTask,
} from "@/lib/tasks/recommendation";

function makeTask(
  id: string,
  createdAt: string,
  overrides: Partial<Task> = {},
): Task {
  return {
    id,
    title: `Task ${id}`,
    steps: [],
    status: "active",
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

const now = new Date("2026-07-10T15:00:00");

describe("recommendNextTask", () => {
  it("prefers the last active task when it is still eligible", () => {
    const tasks = [
      makeTask("older", "2026-07-08T12:00:00.000Z", {
        steps: [
          { id: "s1", title: "Step", completed: false, order: 0 },
        ],
      }),
      makeTask("last-active", "2026-07-10T12:00:00.000Z"),
    ];

    const recommended = recommendNextTask(tasks, {
      lastActiveTaskId: "last-active",
      now,
    });

    expect(recommended?.id).toBe("last-active");
  });

  it("prefers active tasks with incomplete steps when no last active match", () => {
    const tasks = [
      makeTask("oldest-plain", "2026-07-08T12:00:00.000Z"),
      makeTask("with-steps", "2026-07-09T12:00:00.000Z", {
        steps: [
          { id: "s1", title: "Draft", completed: false, order: 0 },
        ],
      }),
    ];

    const recommended = recommendNextTask(tasks, { now });

    expect(recommended?.id).toBe("with-steps");
  });

  it("falls back to the oldest active task not snoozed", () => {
    const tasks = [
      makeTask("newer", "2026-07-10T12:00:00.000Z"),
      makeTask("older", "2026-07-09T12:00:00.000Z"),
      makeTask("snoozed", "2026-07-08T12:00:00.000Z", {
        snoozedUntil: "2026-07-12",
      }),
    ];

    const recommended = recommendNextTask(tasks, { now });

    expect(recommended?.id).toBe("older");
  });

  it("returns null when every active task is snoozed or inactive", () => {
    const tasks = [
      makeTask("snoozed", "2026-07-08T12:00:00.000Z", {
        snoozedUntil: "2026-07-12",
      }),
      makeTask("completed", "2026-07-07T12:00:00.000Z", {
        status: "completed",
      }),
    ];

    expect(recommendNextTask(tasks, { now })).toBeNull();
  });
});

describe("recommendOldestActiveTask", () => {
  it("returns the oldest active task that is not snoozed", () => {
    const tasks = [
      makeTask("newer", "2026-07-10T12:00:00.000Z"),
      makeTask("older", "2026-07-09T12:00:00.000Z"),
    ];

    expect(recommendOldestActiveTask(tasks, now)?.id).toBe("older");
  });
});
