"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { EnergyTagSelect } from "@/components/tasks/energy-tag-select";
import { Button } from "@/components/ui/button";
import type { EnergyLevel } from "@/lib/types";
import { getBrowserStorage } from "@/lib/storage/browser";
import { createTask } from "@/lib/tasks/create-task";

interface QuickCaptureProps {
  autoFocus?: boolean;
  submitLabel?: string;
  submitVariant?: "primary" | "secondary" | "ghost";
}

export function QuickCapture({
  autoFocus = false,
  submitLabel = "Add task",
  submitVariant = "primary",
}: QuickCaptureProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [energy, setEnergy] = useState<EnergyLevel | undefined>();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const task = createTask({ title, energy });
      getBrowserStorage().upsertTask(task);
      router.push(`/tasks/${task.id}`);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Could not add task",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="quick-capture-title" className="text-sm font-medium text-foreground">
          Task
        </label>
        <input
          id="quick-capture-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What's one small thing you could start?"
          autoFocus={autoFocus}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-foreground placeholder:text-foreground-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <EnergyTagSelect value={energy} onChange={setEnergy} id="quick-capture-energy" />

      {error ? (
        <p role="alert" className="text-sm text-warning">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant={submitVariant} className="w-full sm:w-auto">
        {submitLabel}
      </Button>
    </form>
  );
}
