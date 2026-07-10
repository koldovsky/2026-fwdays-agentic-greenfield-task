import { describe, expect, it, beforeEach } from "vitest";

import { getCachedSessionSnapshot } from "@/lib/focus/session-store";
import { getBrowserStorage, resetBrowserStorageForTests } from "@/lib/storage/browser";
import type { FocusSession } from "@/lib/types";

function createSession(taskId: string): FocusSession {
  return {
    id: "session_1",
    taskId,
    stepId: "step_1",
    plannedMinutes: 5,
    startedAt: "2026-07-10T10:00:00.000Z",
    pausedMs: 0,
    status: "active",
  };
}

describe("session store snapshot cache", () => {
  beforeEach(() => {
    resetBrowserStorageForTests();
    getBrowserStorage().clear();
  });

  it("returns a referentially stable snapshot while session data is unchanged", () => {
    getBrowserStorage().setActiveSession(createSession("task_1"));

    const first = getCachedSessionSnapshot("task_1");
    const second = getCachedSessionSnapshot("task_1");

    expect(first).not.toBeNull();
    expect(first).toBe(second);
  });

  it("returns null for other tasks and updates when session changes", () => {
    getBrowserStorage().setActiveSession(createSession("task_1"));

    expect(getCachedSessionSnapshot("task_2")).toBeNull();

    const activeSnapshot = getCachedSessionSnapshot("task_1");

    getBrowserStorage().setActiveSession({
      ...createSession("task_1"),
      status: "paused",
      pausedAt: "2026-07-10T10:01:00.000Z",
    });

    const pausedSnapshot = getCachedSessionSnapshot("task_1");

    expect(activeSnapshot?.status).toBe("active");
    expect(pausedSnapshot?.status).toBe("paused");
    expect(activeSnapshot).not.toBe(pausedSnapshot);
  });
});
