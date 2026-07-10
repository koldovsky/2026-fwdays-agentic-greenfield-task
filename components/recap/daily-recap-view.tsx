"use client";

import { useEffect, useState } from "react";

import { ReflectionTags } from "@/components/recap/reflection-tags";
import { Button } from "@/components/ui/button";
import {
  getRecapHeadline,
  getRecapSubline,
  getTodayRecap,
  saveReflectionTagToggle,
  type DailyRecap,
} from "@/lib/recap/daily-recap";
import type { ReflectionTagId } from "@/lib/recap/constants";
import { getBrowserStorage } from "@/lib/storage/browser";

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3 text-center">
      <p className="font-mono text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-foreground-muted">{label}</p>
    </div>
  );
}

export function DailyRecapView() {
  const [recap, setRecap] = useState<DailyRecap>(() =>
    getTodayRecap(getBrowserStorage()),
  );

  useEffect(() => {
    const refresh = () => setRecap(getTodayRecap(getBrowserStorage()));

    refresh();
    window.addEventListener("tinystart:change", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("tinystart:change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  function handleToggleTag(tagId: ReflectionTagId) {
    saveReflectionTagToggle(getBrowserStorage(), tagId);
    setRecap(getTodayRecap(getBrowserStorage()));
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold leading-8 text-foreground">
          Daily recap
        </h1>
        <p className="text-sm text-foreground-muted">{getRecapHeadline(recap)}</p>
        <p className="text-sm text-foreground-subtle">{getRecapSubline(recap)}</p>
      </header>

      <section aria-label="Daily summary" className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatItem
            label="Minutes focused"
            value={String(recap.minutesFocused)}
          />
          <StatItem
            label="Tasks touched"
            value={String(recap.tasksTouched)}
          />
          <StatItem
            label="Steps completed"
            value={String(recap.stepsCompleted)}
          />
        </div>
      </section>

      <ReflectionTags selected={recap.reflectionTags} onToggle={handleToggleTag} />

      <Button href="/" variant="secondary" className="w-full sm:w-auto">
        Back to Home
      </Button>
    </div>
  );
}
