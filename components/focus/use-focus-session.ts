"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import { useTask } from "@/components/tasks/use-task";
import type { FocusSession } from "@/lib/types";
import { getBrowserStorage } from "@/lib/storage/browser";
import {
  getCachedSessionSnapshot,
  subscribeToSessionStore,
} from "@/lib/focus/session-store";
import {
  advanceTaskStep,
  createFocusSession,
  getInitialStepId,
  shrinkSession,
} from "@/lib/focus/steps";
import {
  completeSessionIfExpired,
  endSession,
  extendSession,
  getRemainingSeconds,
  pauseSession,
  resumeSession,
} from "@/lib/focus/timer";
import { finalizeFocusSession } from "@/lib/completion/finalize-session";
import { incrementStepsCompleted } from "@/lib/completion/record-session";

export function useFocusSession(taskId: string) {
  const { task, hasLoaded: hasTaskLoaded } = useTask(taskId);
  const [endedSession, setEndedSession] = useState<FocusSession | null>(null);
  const [now, setNow] = useState(() => new Date());

  const session = useSyncExternalStore(
    subscribeToSessionStore,
    () => getCachedSessionSnapshot(taskId),
    () => null,
  );

  useEffect(() => {
    if (!session || session.status !== "active") {
      return;
    }

    const timerId = window.setInterval(() => {
      const currentNow = new Date();
      setNow(currentNow);

      const active = getBrowserStorage().getActiveSession();
      if (
        !active ||
        active.taskId !== taskId ||
        active.status !== "active"
      ) {
        return;
      }

      const completed = completeSessionIfExpired(active, currentNow);
      if (completed.status === "completed") {
        finalizeFocusSession(completed);
        setEndedSession(completed);
      }
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [session, taskId]);

  const persistActive = useCallback((nextSession: FocusSession | null) => {
    getBrowserStorage().setActiveSession(nextSession);
  }, []);

  const clearOtherActiveSessions = useCallback(() => {
    const existing = getBrowserStorage().getActiveSession();
    if (!existing) {
      return;
    }

    getBrowserStorage().archiveSession(
      endSession(existing, new Date(), "abandoned"),
    );
    getBrowserStorage().setActiveSession(null);
  }, []);

  const startSession = useCallback(
    (plannedMinutes: number) => {
      if (!task) {
        return;
      }

      clearOtherActiveSessions();
      getBrowserStorage().setLastActiveTaskId(taskId);
      const created = createFocusSession(
        taskId,
        plannedMinutes,
        getInitialStepId(task),
      );
      setEndedSession(null);
      setNow(new Date());
      persistActive(created);
    },
    [clearOtherActiveSessions, persistActive, task, taskId],
  );

  const pause = useCallback(() => {
    if (!session) {
      return;
    }

    persistActive(pauseSession(session, new Date()));
  }, [persistActive, session]);

  const resume = useCallback(() => {
    if (!session) {
      return;
    }

    const currentNow = new Date();
    setNow(currentNow);
    persistActive(resumeSession(session, currentNow));
  }, [persistActive, session]);

  const extend = useCallback(() => {
    if (!session) {
      return;
    }

    persistActive(extendSession(session));
  }, [persistActive, session]);

  const end = useCallback(
    (outcome: "completed" | "abandoned" = "abandoned") => {
      if (!session) {
        return;
      }

      const finished = endSession(session, new Date(), outcome);
      if (finished.status === "completed") {
        finalizeFocusSession(finished);
      } else {
        getBrowserStorage().setActiveSession(null);
        getBrowserStorage().archiveSession(finished);
      }
      setEndedSession(finished);
    },
    [session],
  );

  const shrink = useCallback(() => {
    if (!session || !task) {
      return;
    }

    persistActive(shrinkSession(session, task, new Date()));
  }, [persistActive, session, task]);

  const completeCurrentStep = useCallback(() => {
    if (!session || !task || !session.stepId) {
      return;
    }

    const { task: updatedTask, nextStepId } = advanceTaskStep(
      task,
      session.stepId,
    );
    getBrowserStorage().upsertTask(updatedTask);
    incrementStepsCompleted(getBrowserStorage());
    persistActive({
      ...session,
      stepId: nextStepId,
    });
  }, [persistActive, session, task]);

  const remainingSeconds = session
    ? getRemainingSeconds(session, now)
    : 0;

  const keepGoing = useCallback(() => {
    if (!endedSession) {
      return;
    }

    const minutes = endedSession.plannedMinutes;
    setEndedSession(null);
    startSession(minutes);
  }, [endedSession, startSession]);

  return {
    task,
    session,
    endedSession,
    hasLoaded: hasTaskLoaded,
    remainingSeconds,
    startSession,
    pause,
    resume,
    extend,
    end,
    shrink,
    completeCurrentStep,
    keepGoing,
    clearEndedSession: () => setEndedSession(null),
  };
}
