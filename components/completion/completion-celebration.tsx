"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { sessionFocusedMinutes } from "@/lib/completion/record-session";
import {
  areAllStepsComplete,
  formatFocusedDuration,
  getCelebrationCopy,
} from "@/lib/completion/session-utils";
import { getBrowserStorage } from "@/lib/storage/browser";
import { markTaskComplete } from "@/lib/tasks/task-actions";
import type { FocusSession, Task } from "@/lib/types";

interface CompletionCelebrationProps {
  session: FocusSession;
  task: Task;
  onKeepGoing: () => void;
}

export function CompletionCelebration({
  session,
  task,
  onKeepGoing,
}: CompletionCelebrationProps) {
  const router = useRouter();
  const minutes = sessionFocusedMinutes(session);
  const allStepsDone = areAllStepsComplete(task);

  function handleMarkTaskComplete() {
    getBrowserStorage().upsertTask(markTaskComplete(task));
    router.push("/");
  }

  return (
    <section
      aria-label="Session complete"
      className="mx-auto w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center shadow-md"
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">
          {getCelebrationCopy(session.id)}
        </h1>
        <p className="text-sm text-foreground-muted">
          You focused for {formatFocusedDuration(minutes)}.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Button type="button" onClick={onKeepGoing} className="w-full">
          Keep going
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => router.push("/")}
        >
          Take a break
        </Button>
        {allStepsDone ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={handleMarkTaskComplete}
          >
            Mark task complete
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => router.push("/")}
        >
          Done for now
        </Button>
      </div>
    </section>
  );
}

export function SessionEnded() {
  const router = useRouter();

  return (
    <section
      aria-label="Session ended"
      className="flex w-full max-w-md flex-col items-center gap-6 text-center"
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Session ended</h1>
        <p className="text-sm text-foreground-muted">
          Paused is okay. Pick up whenever.
        </p>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full sm:w-auto"
        onClick={() => router.push("/")}
      >
        Back to Home
      </Button>
    </section>
  );
}
