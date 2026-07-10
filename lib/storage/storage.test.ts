import { describe, expect, it } from "vitest";

import type { FocusSession, Task } from "@/lib/types";
import { createMemoryStorageAdapter } from "@/lib/storage/adapter";
import {
  aggregateDailyStats,
  aggregateDailyStatsForDate,
} from "@/lib/storage/daily-stats";
import { TinyStartStorage, createId } from "@/lib/storage/index";
import {
  isSnoozed,
  localDateString,
  snoozeUntilTomorrow,
  withExpiredSnoozeCleared,
} from "@/lib/storage/snooze";

function createTask(overrides: Partial<Task> = {}): Task {
  const now = "2026-07-10T10:00:00.000Z";
  return {
    id: "task_1",
    title: "Write report",
    steps: [],
    status: "active",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createSession(overrides: Partial<FocusSession> = {}): FocusSession {
  return {
    id: "session_1",
    taskId: "task_1",
    plannedMinutes: 5,
    startedAt: "2026-07-10T10:00:00.000Z",
    endedAt: "2026-07-10T10:05:00.000Z",
    pausedMs: 0,
    status: "completed",
    ...overrides,
  };
}

describe("TinyStartStorage", () => {
  it("creates, reads, updates, and deletes tasks", () => {
    const storage = new TinyStartStorage(createMemoryStorageAdapter());
    const task = createTask();

    storage.upsertTask(task);
    expect(storage.getTask(task.id)?.title).toBe("Write report");

    storage.upsertTask({ ...task, title: "Write weekly report" });
    expect(storage.getTask(task.id)?.title).toBe("Write weekly report");

    storage.deleteTask(task.id);
    expect(storage.getTask(task.id)).toBeUndefined();
  });

  it("round-trips active and paused focus sessions", () => {
    const adapter = createMemoryStorageAdapter();
    const storage = new TinyStartStorage(adapter);
    const active = createSession({
      id: "session_active",
      status: "active",
      endedAt: undefined,
    });

    storage.setActiveSession(active);
    expect(storage.getActiveSession()).toEqual(active);

    const paused = { ...active, status: "paused" as const };
    storage.setActiveSession(paused);

    const reloaded = new TinyStartStorage(adapter);
    expect(reloaded.getActiveSession()?.status).toBe("paused");
  });

  it("archives completed sessions and clears active session", () => {
    const storage = new TinyStartStorage(createMemoryStorageAdapter());
    const session = createSession({ id: "session_done" });

    storage.setActiveSession({
      ...session,
      status: "active",
      endedAt: undefined,
    });
    storage.archiveSession(session);

    expect(storage.getActiveSession()).toBeNull();
    expect(storage.getSessions()).toEqual([session]);
  });

  it("persists daily stats updates", () => {
    const storage = new TinyStartStorage(createMemoryStorageAdapter());

    storage.upsertDailyStats({
      date: "2026-07-10",
      minutesFocused: 5,
      sessionsCompleted: 1,
      tasksTouched: ["task_1"],
      stepsCompleted: 0,
    });

    storage.upsertDailyStats({
      date: "2026-07-10",
      minutesFocused: 8,
      sessionsCompleted: 2,
      tasksTouched: ["task_1", "task_2"],
      stepsCompleted: 1,
    });

    expect(storage.getDailyStats("2026-07-10")).toEqual({
      date: "2026-07-10",
      minutesFocused: 8,
      sessionsCompleted: 2,
      tasksTouched: ["task_1", "task_2"],
      stepsCompleted: 1,
    });
  });
});

describe("snooze helpers", () => {
  it("treats tasks as snoozed until the local snooze day", () => {
    const task = createTask({ snoozedUntil: "2026-07-11" });
    const today = new Date("2026-07-10T15:00:00");

    expect(isSnoozed(task, today)).toBe(true);
    expect(withExpiredSnoozeCleared(task, today).snoozedUntil).toBe("2026-07-11");
  });

  it("clears expired snoozes on or after the snooze day", () => {
    const task = createTask({ snoozedUntil: "2026-07-10" });
    const today = new Date("2026-07-10T08:00:00");

    expect(isSnoozed(task, today)).toBe(false);
    expect(withExpiredSnoozeCleared(task, today).snoozedUntil).toBeUndefined();
  });

  it("snoozes until tomorrow in local timezone", () => {
    const now = new Date("2026-07-10T23:30:00");
    expect(snoozeUntilTomorrow(now)).toBe(
      localDateString(new Date("2026-07-11T23:30:00")),
    );
  });
});

describe("DailyStats aggregation", () => {
  it("aggregates completed session minutes for a local day", () => {
    const sessions = [
      createSession({
        id: "s1",
        startedAt: "2026-07-10T10:00:00.000Z",
        endedAt: "2026-07-10T10:04:30.000Z",
        pausedMs: 30_000,
      }),
      createSession({
        id: "s2",
        taskId: "task_2",
        startedAt: "2026-07-10T11:00:00.000Z",
        endedAt: "2026-07-10T11:02:00.000Z",
      }),
      createSession({
        id: "s3",
        status: "active",
        endedAt: undefined,
      }),
    ];

    const stats = aggregateDailyStatsForDate(sessions, "2026-07-10");

    expect(stats.minutesFocused).toBe(6);
    expect(stats.sessionsCompleted).toBe(2);
    expect(stats.tasksTouched).toEqual(["task_1", "task_2"]);
  });

  it("builds stats rows for each day in session history", () => {
    const sessions = [
      createSession({ id: "s1" }),
      createSession({
        id: "s2",
        startedAt: "2026-07-11T09:00:00.000Z",
        endedAt: "2026-07-11T09:10:00.000Z",
      }),
    ];

    const rows = aggregateDailyStats(sessions);
    expect(rows).toHaveLength(2);
    expect(rows[0].date).toBe("2026-07-10");
    expect(rows[1].minutesFocused).toBe(10);
  });
});

describe("createId", () => {
  it("returns prefixed identifiers", () => {
    expect(createId("task")).toMatch(/^task_/);
  });
});
