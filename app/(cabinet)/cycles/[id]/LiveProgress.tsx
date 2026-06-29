"use client";
// @trace FR-PROGRESS-01 TC-AI-04

import { useEffect, useState } from "react";
import { z } from "zod";
import { ProgressBar } from "@/components/data/ProgressBar";
import { uk } from "@/lib/i18n/uk";

const progressSchema = z.object({
  answered: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

const POLL_INTERVAL_MS = 5000;

/**
 * Live answered/total progress for the cycle detail (FR-PROGRESS-01). Renders
 * the shared ProgressBar from server-provided initial values, then — only while
 * the cycle is still collecting — polls the progress endpoint over plain HTTP
 * (no WebSocket, TC-AI-04) and updates in place. A failed poll keeps the last
 * value rather than throwing.
 */
export function LiveProgress({
  cycleId,
  initial,
  poll,
}: {
  cycleId: string;
  initial: { answered: number; total: number };
  poll: boolean;
}) {
  const [progress, setProgress] = useState(initial);

  useEffect(() => {
    if (!poll) return;
    let cancelled = false;

    async function tick() {
      try {
        const response = await fetch(`/api/cycles/${cycleId}/progress`, { cache: "no-store" });
        if (!response.ok) return;
        const data: unknown = await response.json();
        const parsed = progressSchema.safeParse(data);
        if (!cancelled && parsed.success) setProgress(parsed.data);
      } catch {
        // Transient network error — keep the last known value.
      }
    }

    const id = setInterval(() => void tick(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [cycleId, poll]);

  return (
    <ProgressBar answered={progress.answered} total={progress.total} label={uk.cycles.results.progressLabel} />
  );
}
