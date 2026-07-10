import type { FocusSession } from "@/lib/types";

export function getElapsedMs(session: FocusSession, now: Date): number {
  const startedMs = new Date(session.startedAt).getTime();
  const nowMs = now.getTime();

  if (session.status === "paused" && session.pausedAt) {
    return new Date(session.pausedAt).getTime() - startedMs - session.pausedMs;
  }

  if (session.endedAt) {
    return new Date(session.endedAt).getTime() - startedMs - session.pausedMs;
  }

  return nowMs - startedMs - session.pausedMs;
}

export function getRemainingSeconds(session: FocusSession, now: Date): number {
  const totalMs = session.plannedMinutes * 60_000;
  const elapsedMs = getElapsedMs(session, now);
  return Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));
}

export function isTimerComplete(session: FocusSession, now: Date): boolean {
  return getRemainingSeconds(session, now) <= 0;
}

export function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function pauseSession(session: FocusSession, now: Date): FocusSession {
  if (session.status !== "active") {
    return session;
  }

  return {
    ...session,
    status: "paused",
    pausedAt: now.toISOString(),
  };
}

export function resumeSession(session: FocusSession, now: Date): FocusSession {
  if (session.status !== "paused" || !session.pausedAt) {
    return session;
  }

  const pauseDuration =
    now.getTime() - new Date(session.pausedAt).getTime();

  return {
    ...session,
    status: "active",
    pausedMs: session.pausedMs + pauseDuration,
    pausedAt: undefined,
  };
}

export function extendSession(
  session: FocusSession,
  minutes = 5,
): FocusSession {
  return {
    ...session,
    plannedMinutes: session.plannedMinutes + minutes,
  };
}

export function endSession(
  session: FocusSession,
  now: Date,
  outcome: "completed" | "abandoned",
): FocusSession {
  let nextSession: FocusSession = {
    ...session,
    status: outcome,
    endedAt: now.toISOString(),
  };

  if (session.status === "paused" && session.pausedAt) {
    const pauseDuration =
      now.getTime() - new Date(session.pausedAt).getTime();
    nextSession = {
      ...nextSession,
      pausedMs: session.pausedMs + pauseDuration,
      pausedAt: undefined,
    };
  }

  return nextSession;
}

export function completeSessionIfExpired(
  session: FocusSession,
  now: Date,
): FocusSession {
  if (session.status !== "active") {
    return session;
  }

  if (isTimerComplete(session, now)) {
    return endSession(session, now, "completed");
  }

  return session;
}
