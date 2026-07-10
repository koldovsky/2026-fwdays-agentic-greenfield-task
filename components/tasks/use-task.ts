"use client";

import { useEffect, useState } from "react";

import { getBrowserStorage } from "@/lib/storage/browser";
import type { Task } from "@/lib/types";

interface UseTaskResult {
  task: Task | undefined;
  hasLoaded: boolean;
}

export function useTask(taskId: string): UseTaskResult {
  const [task, setTask] = useState<Task | undefined>();
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setTask(getBrowserStorage().getTask(taskId));
      setHasLoaded(true);
    };

    refresh();
    window.addEventListener("tinystart:change", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("tinystart:change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [taskId]);

  return { task, hasLoaded };
}
