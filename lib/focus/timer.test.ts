import { describe, expect, it } from "vitest";

import { EXTEND_MINUTES, SHRINK_MINUTES } from "@/lib/focus/constants";
import {
  createFocusSession,
  shrinkSession,
} from "@/lib/focus/steps";
import {
  completeSessionIfExpired,
  endSession,
  extendSession,
  formatTimer,
  getRemainingSeconds,
  pauseSession,
  resumeSession,
} from "@/lib/focus/timer";
import type { FocusSession, Task } from "@/lib/types";

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

function runningSession(
  plannedMinutes: number,
  startedAt: string,
): FocusSession {
  return {
    id: "session_1",
    taskId: "task_1",
    stepId: "step_1",
    plannedMinutes,
    startedAt,
    pausedMs: 0,
    status: "active",
  };
}

describe("focus timer state machine", () => {
  it("starts presets with the selected duration", () => {
    const session = createFocusSession(
      "task_1",
      5,
      "step_1",
      new Date("2026-07-10T10:00:00.000Z"),
    );

    expect(session.plannedMinutes).toBe(5);
    expect(session.status).toBe("active");
    expect(getRemainingSeconds(session, new Date("2026-07-10T10:02:00.000Z"))).toBe(
      180,
    );
  });

  it("pauses and resumes without losing elapsed time", () => {
    const start = new Date("2026-07-10T10:00:00.000Z");
    let session = runningSession(5, start.toISOString());

    session = pauseSession(session, new Date("2026-07-10T10:01:00.000Z"));
    expect(session.status).toBe("paused");
    expect(getRemainingSeconds(session, new Date("2026-07-10T10:03:00.000Z"))).toBe(
      240,
    );

    session = resumeSession(session, new Date("2026-07-10T10:05:00.000Z"));
    expect(session.status).toBe("active");
    expect(session.pausedMs).toBe(4 * 60_000);
    expect(
      getRemainingSeconds(session, new Date("2026-07-10T10:01:00.000Z")),
    ).toBe(480);
    expect(getRemainingSeconds(session, new Date("2026-07-10T10:05:00.000Z"))).toBe(
      240,
    );
    expect(getRemainingSeconds(session, new Date("2026-07-10T10:06:00.000Z"))).toBe(
      180,
    );
  });

  it("extends a session by five minutes", () => {
    const session = extendSession(runningSession(5, "2026-07-10T10:00:00.000Z"));

    expect(session.plannedMinutes).toBe(5 + EXTEND_MINUTES);
  });

  it("ends and auto-completes sessions", () => {
    const start = new Date("2026-07-10T10:00:00.000Z");
    let session = runningSession(2, start.toISOString());

    session = completeSessionIfExpired(
      session,
      new Date("2026-07-10T10:02:00.000Z"),
    );
    expect(session.status).toBe("completed");
    expect(session.endedAt).toBeDefined();

    const abandoned = endSession(
      runningSession(5, start.toISOString()),
      new Date("2026-07-10T10:01:00.000Z"),
      "abandoned",
    );
    expect(abandoned.status).toBe("abandoned");
  });

  it("shrinks to the first step with a two-minute timer", () => {
    const session = runningSession(15, "2026-07-10T10:00:00.000Z");
    const shrunk = shrinkSession(
      session,
      createTask(),
      new Date("2026-07-10T10:05:00.000Z"),
    );

    expect(shrunk.plannedMinutes).toBe(SHRINK_MINUTES);
    expect(shrunk.stepId).toBe("step_1");
    expect(getRemainingSeconds(shrunk, new Date("2026-07-10T10:05:00.000Z"))).toBe(
      120,
    );
  });

  it("formats countdown values for display", () => {
    expect(formatTimer(125)).toBe("02:05");
  });
});
