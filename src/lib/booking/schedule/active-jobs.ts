import type { ScheduledJob } from "@/lib/booking/schedule/types";

const ACTIVE_STATUSES = new Set<ScheduledJob["status"]>(["waiting", "ready", "running"]);

/** True when cron / schedule:run should do work (non-terminal queue). */
export function hasActiveScheduledJobs(jobs: ScheduledJob[], now: Date = new Date()): boolean {
  for (const job of jobs) {
    if (!ACTIVE_STATUSES.has(job.status)) continue;
    if (job.status === "ready" || job.status === "running") return true;
    const opens = new Date(job.opensAt);
    if (!Number.isNaN(opens.getTime()) && opens <= now) return true;
  }
  return false;
}
