import { describe, expect, it } from "vitest";

import { createMemoryStorageAdapter } from "@/lib/storage/adapter";
import { TinyStartStorage } from "@/lib/storage/index";
import {
  getTodayMinutesFocused,
  recordCompletedSession,
  sessionFocusedMinutes,
  sessionStatsDate,
} from "@/lib/completion/record-session";
import type { FocusSession } from "@/lib/types";

function completedSession(
  overrides: Partial<FocusSession> = {},
): FocusSession {
  return {
    id: "session_1",
    taskId: "task_1",
    plannedMinutes: 5,
    startedAt: "2026-07-10T10:00:00.000Z",
    endedAt: "2026-07-10T10:04:30.000Z",
    pausedMs: 30_000,
    status: "completed",
    ...overrides,
  };
}

describe("recordCompletedSession", () => {
  it("accumulates focused minutes for today", () => {
    const storage = new TinyStartStorage(createMemoryStorageAdapter());
    recordCompletedSession(storage, completedSession());

    expect(getTodayMinutesFocused(storage)).toBe(4);
    expect(storage.getDailyStats(sessionStatsDate(completedSession()))).toEqual({
      date: "2026-07-10",
      minutesFocused: 4,
      sessionsCompleted: 1,
      tasksTouched: ["task_1"],
      stepsCompleted: 0,
    });
  });

  it("adds minutes across multiple completed sessions", () => {
    const storage = new TinyStartStorage(createMemoryStorageAdapter());

    recordCompletedSession(storage, completedSession({ id: "s1" }));
    recordCompletedSession(
      storage,
      completedSession({
        id: "s2",
        endedAt: "2026-07-10T10:02:00.000Z",
        pausedMs: 0,
      }),
    );

    expect(storage.getDailyStats("2026-07-10")?.minutesFocused).toBe(6);
    expect(storage.getDailyStats("2026-07-10")?.sessionsCompleted).toBe(2);
  });

  it("ignores abandoned sessions", () => {
    const storage = new TinyStartStorage(createMemoryStorageAdapter());
    recordCompletedSession(
      storage,
      completedSession({ status: "abandoned" }),
    );

    expect(getTodayMinutesFocused(storage)).toBe(0);
  });

  it("rounds focused duration to at least one minute", () => {
    const session = completedSession({
      startedAt: "2026-07-10T10:00:00.000Z",
      endedAt: "2026-07-10T10:00:20.000Z",
      pausedMs: 0,
    });

    expect(sessionFocusedMinutes(session)).toBe(1);
  });

  it("uses the local calendar day from the session end time", () => {
    const session = completedSession({
      startedAt: "2026-07-10T23:50:00.000Z",
      endedAt: "2026-07-11T00:05:00.000Z",
      pausedMs: 0,
    });

    expect(sessionStatsDate(session)).toBe("2026-07-11");
  });
});
