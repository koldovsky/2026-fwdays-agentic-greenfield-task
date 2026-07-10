"use client";

import { useEffect, useState } from "react";

import { EmptyStateIllustration } from "@/components/home/empty-state-illustration";
import { HeroCard } from "@/components/home/hero-card";
import { MicroRecapStrip } from "@/components/home/micro-recap-strip";
import { QuickCapture } from "@/components/tasks/quick-capture";
import { getTimeAwareGreeting, getGreetingSubtitle } from "@/lib/home/greeting";
import type { Task } from "@/lib/types";
import { getBrowserStorage } from "@/lib/storage/browser";
import { recommendNextTask } from "@/lib/tasks/recommendation";
import { snoozeTaskUntilTomorrow } from "@/lib/tasks/snooze-task";

function loadHomeState(): { tasks: Task[]; lastActiveTaskId?: string } {
  const storage = getBrowserStorage();
  return {
    tasks: storage.getTasks(),
    lastActiveTaskId: storage.getLastActiveTaskId(),
  };
}

export function TodayHome() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lastActiveTaskId, setLastActiveTaskId] = useState<string | undefined>();
  const [snoozeMessage, setSnoozeMessage] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      const state = loadHomeState();
      setTasks(state.tasks);
      setLastActiveTaskId(state.lastActiveTaskId);
    };

    refresh();
    window.addEventListener("tinystart:change", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("tinystart:change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const recommendedTask = recommendNextTask(tasks, { lastActiveTaskId });

  function handleSnooze(task: Task) {
    getBrowserStorage().upsertTask(snoozeTaskUntilTomorrow(task));
    setSnoozeMessage("Not today — we'll surface it tomorrow.");
    window.setTimeout(() => setSnoozeMessage(null), 3000);
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold leading-8 text-foreground">
          {getTimeAwareGreeting()}
        </h1>
        <p className="text-sm text-foreground-muted">{getGreetingSubtitle()}</p>
      </header>

      {snoozeMessage ? (
        <p role="status" aria-live="polite" className="text-sm text-foreground-muted">
          {snoozeMessage}
        </p>
      ) : null}

      <section aria-label="Recommended task" className="space-y-4">
        {recommendedTask ? (
          <HeroCard task={recommendedTask} onSnooze={handleSnooze} />
        ) : (
          <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
            <EmptyStateIllustration />
            <p className="mt-4 text-base text-foreground-muted">
              Nothing here yet. What&apos;s one small thing you could start?
            </p>
          </div>
        )}
      </section>

      <section aria-label="Quick add task">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Quick add</h2>
        <QuickCapture submitVariant={recommendedTask ? "secondary" : "primary"} />
      </section>

      <MicroRecapStrip />
    </div>
  );
}
