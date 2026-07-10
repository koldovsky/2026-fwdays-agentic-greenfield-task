import type { DailyStats, FocusSession } from "@/lib/types";

import { localDateString } from "@/lib/storage/snooze";

function sessionFocusedMs(session: FocusSession): number {
  if (!session.endedAt) {
    return 0;
  }

  const elapsed =
    new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime();

  return Math.max(0, elapsed - session.pausedMs);
}

function sessionLocalDate(session: FocusSession): string {
  const anchor = session.endedAt ?? session.startedAt;
  return localDateString(new Date(anchor));
}

/** Aggregate completed/abandoned sessions into DailyStats for one local calendar day. */
export function aggregateDailyStatsForDate(
  sessions: FocusSession[],
  date: string,
): DailyStats {
  const daySessions = sessions.filter(
    (session) =>
      (session.status === "completed" || session.status === "abandoned") &&
      sessionLocalDate(session) === date,
  );

  const tasksTouched = [
    ...new Set(daySessions.map((session) => session.taskId)),
  ];

  const minutesFocused = daySessions.reduce((total, session) => {
    return total + Math.round(sessionFocusedMs(session) / 60_000);
  }, 0);

  const sessionsCompleted = daySessions.filter(
    (session) => session.status === "completed",
  ).length;

  return {
    date,
    minutesFocused,
    sessionsCompleted,
    tasksTouched,
    stepsCompleted: 0,
  };
}

/** Build DailyStats entries for every local day present in the session list. */
export function aggregateDailyStats(sessions: FocusSession[]): DailyStats[] {
  const dates = new Set<string>();

  for (const session of sessions) {
    if (session.status === "completed" || session.status === "abandoned") {
      dates.add(sessionLocalDate(session));
    }
  }

  return [...dates]
    .sort()
    .map((date) => aggregateDailyStatsForDate(sessions, date));
}

/** Merge writer-side step completions into an existing DailyStats row. */
export function mergeDailyStats(
  base: DailyStats,
  patch: Partial<DailyStats>,
): DailyStats {
  return {
    date: base.date,
    minutesFocused: patch.minutesFocused ?? base.minutesFocused,
    sessionsCompleted: patch.sessionsCompleted ?? base.sessionsCompleted,
    tasksTouched: patch.tasksTouched ?? base.tasksTouched,
    stepsCompleted: patch.stepsCompleted ?? base.stepsCompleted,
    reflectionTags: patch.reflectionTags ?? base.reflectionTags,
  };
}
