"use client";

import Link from "next/link";

import {
  CompletionCelebration,
  SessionEnded,
} from "@/components/completion/completion-celebration";
import { FocusPresetPicker } from "@/components/focus/focus-preset-picker";
import { FocusResumePrompt } from "@/components/focus/focus-resume-prompt";
import { FocusSessionActive } from "@/components/focus/focus-session-active";
import { useFocusSession } from "@/components/focus/use-focus-session";
import { Button } from "@/components/ui/button";
import { SHRINK_MINUTES } from "@/lib/focus/constants";

export function FocusSessionView({ taskId }: Readonly<{ taskId: string }>) {
  const {
    task,
    session,
    endedSession,
    hasLoaded,
    remainingSeconds,
    startSession,
    pause,
    resume,
    extend,
    end,
    shrink,
    completeCurrentStep,
    keepGoing,
  } = useFocusSession(taskId);

  if (!hasLoaded) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-8">
        <p className="text-sm text-foreground-muted">Loading focus session…</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col gap-6 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Task not found</h1>
        <Button href="/" variant="secondary" className="w-fit">
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-background text-foreground">
      <a
        href="#focus-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-sm focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
      >
        Skip to focus session
      </a>

      <main
        id="focus-main"
        className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8 sm:px-6"
      >
        {endedSession?.status === "completed" ? (
          <CompletionCelebration
            session={endedSession}
            task={task}
            onKeepGoing={keepGoing}
          />
        ) : endedSession ? (
          <SessionEnded />
        ) : session?.status === "paused" ? (
          <FocusResumePrompt
            remainingSeconds={remainingSeconds}
            onResume={resume}
            onEnd={() => end("abandoned")}
          />
        ) : session?.status === "active" ? (
          <FocusSessionActive
            task={task}
            session={session}
            remainingSeconds={remainingSeconds}
            onPause={pause}
            onExtend={extend}
            onEnd={() => end("abandoned")}
            onShrink={shrink}
            onDoneStep={completeCurrentStep}
          />
        ) : (
          <FocusPresetPicker
            onSelect={startSession}
            onShrink={() => startSession(SHRINK_MINUTES)}
          />
        )}
      </main>

      {!session && !endedSession ? (
        <div className="px-4 pb-8 text-center sm:px-6">
          <Link
            href="/"
            className="text-sm font-medium text-foreground-muted underline-offset-4 transition-colors duration-150 ease-in-out hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus:ring-offset-background"
          >
            Exit focus
          </Link>
        </div>
      ) : null}
    </div>
  );
}
