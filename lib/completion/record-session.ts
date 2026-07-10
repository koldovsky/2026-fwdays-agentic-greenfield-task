import type { FocusSession } from "@/lib/types";
import type { TinyStartStorage } from "@/lib/storage/index";
import { localDateString } from "@/lib/storage/snooze";
import { getElapsedMs } from "@/lib/focus/timer";

export function sessionFocusedMinutes(session: FocusSession): number {
  const endedAt = session.endedAt ? new Date(session.endedAt) : new Date();
  return Math.max(1, Math.round(getElapsedMs(session, endedAt) / 60_000));
}

export function sessionStatsDate(session: FocusSession): string {
  const anchor = session.endedAt ?? session.startedAt;
  return localDateString(new Date(anchor));
}

/** Writer side of DailyStats — call when a focus session completes (FR-COMPLETE-03). */
export function recordCompletedSession(
  storage: TinyStartStorage,
  session: FocusSession,
  stepsCompleted = 0,
) {
  if (session.status !== "completed") {
    return;
  }

  const date = sessionStatsDate(session);
  const minutes = sessionFocusedMinutes(session);
  const existing = storage.getDailyStats(date) ?? {
    date,
    minutesFocused: 0,
    sessionsCompleted: 0,
    tasksTouched: [],
    stepsCompleted: 0,
  };

  const tasksTouched = existing.tasksTouched.includes(session.taskId)
    ? existing.tasksTouched
    : [...existing.tasksTouched, session.taskId];

  storage.upsertDailyStats({
    date,
    minutesFocused: existing.minutesFocused + minutes,
    sessionsCompleted: existing.sessionsCompleted + 1,
    tasksTouched,
    stepsCompleted: existing.stepsCompleted + stepsCompleted,
  });
}

export function getTodayMinutesFocused(storage: TinyStartStorage): number {
  const today = localDateString(new Date());
  return storage.getDailyStats(today)?.minutesFocused ?? 0;
}

export function incrementStepsCompleted(
  storage: TinyStartStorage,
  count = 1,
  now = new Date(),
): void {
  const date = localDateString(now);
  const existing = storage.getDailyStats(date) ?? {
    date,
    minutesFocused: 0,
    sessionsCompleted: 0,
    tasksTouched: [],
    stepsCompleted: 0,
  };

  storage.upsertDailyStats({
    ...existing,
    stepsCompleted: existing.stepsCompleted + count,
  });
}
