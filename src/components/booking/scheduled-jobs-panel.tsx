"use client";

import { useEffect, useState } from "react";

import { getResidentById } from "@/lib/booking/residents";
import {
  formatNextRetryCalgary,
  getNextRetryAt,
} from "@/lib/booking/schedule/next-cron-run";
import type { ScheduledJob } from "@/lib/booking/schedule/types";
import { formatOpensAtLabel } from "@/lib/booking/tennis-window";

type ScheduledJobsPanelProps = {
  /** `page` shows empty state; `inline` hides when empty (legacy). */
  variant?: "page" | "inline";
};

function formatJobError(error: string): string {
  if (error.includes("ModuleNotFoundError") || error.includes("Traceback")) {
    return "Captcha solver missing on server — install Python ddddocr (pip install -r requirements.txt).";
  }
  if (error.includes("no longer available on MHOA")) {
    return "Requested slot not on MHOA yet — cron will retry every 10 minutes.";
  }
  return error;
}

function jobParticipantLabel(job: ScheduledJob): string {
  if (job.residentId === "other") {
    return job.guestContact?.fullName ?? "Other guest";
  }
  return getResidentById(job.residentId)?.label ?? job.residentId;
}

export function ScheduledJobsPanel({ variant = "page" }: ScheduledJobsPanelProps) {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/booking/schedule");
      const data = (await res.json()) as { jobs: ScheduledJob[] };
      const active = data.jobs.filter((j) => j.status !== "completed");
      setJobs(variant === "page" ? active : active.slice(-10));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [variant]);

  async function handleCancel(id: string) {
    setCancellingId(id);
    try {
      const res = await fetch(`/api/booking/schedule/${id}`, { method: "DELETE" });
      if (res.ok) {
        await refresh();
      }
    } finally {
      setCancellingId(null);
    }
  }

  if (loading && jobs.length === 0) {
    return variant === "page" ? (
      <p className="text-sm text-zinc-500">Loading scheduled bookings…</p>
    ) : null;
  }

  if (jobs.length === 0) {
    if (variant === "inline") return null;
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
        <p className="text-zinc-600">No scheduled bookings in the queue.</p>
        <p className="mt-2 text-sm text-zinc-500">
          Use <strong>Schedule later</strong> on the Book wizard for dates outside MHOA&apos;s
          7-day window.
        </p>
      </div>
    );
  }

  return (
    <section
      className={
        variant === "page"
          ? "space-y-4"
          : "mt-8 rounded-2xl border border-amber-200 bg-amber-50/50 p-5"
      }
    >
      {variant === "inline" && (
        <>
          <h2 className="text-lg font-semibold text-amber-950">Scheduled bookings</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Queued for dates not yet in MHOA&apos;s 7-day window. Runs via{" "}
            <code className="text-xs">npm run schedule:run</code> (or cron).
          </p>
        </>
      )}
      <ul className="space-y-3">
        {jobs.map((job) => {
          const canCancel = job.status === "waiting" || job.status === "ready";
          const nextRetry = getNextRetryAt(job, now);
          return (
            <li
              key={job.id}
              className="rounded-xl border border-amber-100 bg-white p-4 text-sm shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{jobParticipantLabel(job)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    job.status === "completed"
                      ? "bg-emerald-100 text-emerald-800"
                      : job.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {job.status}
                </span>
              </div>
              <p className="mt-1 text-zinc-700">
                {job.targetDate} · {job.windowStart}–{job.windowEnd}
                {job.slotLabel ? ` · ${job.slotLabel}` : " · Any time"}
                {job.courtPreference ? ` · ${job.courtPreference}` : ""}
              </p>
              {job.status === "waiting" && (
                <p className="mt-1 text-xs text-zinc-500">
                  Opens {formatOpensAtLabel(new Date(job.opensAt))}
                </p>
              )}
              {nextRetry && (
                <p className="mt-1 text-xs text-zinc-500">
                  Next retry {formatNextRetryCalgary(nextRetry)}
                </p>
              )}
              {job.error && (
                <p className="mt-1 text-xs text-red-600">{formatJobError(job.error)}</p>
              )}
              {canCancel && (
                <button
                  type="button"
                  disabled={cancellingId === job.id}
                  onClick={() => void handleCancel(job.id)}
                  className="mt-2 text-xs font-medium text-red-700 underline disabled:opacity-50"
                >
                  {cancellingId === job.id ? "Cancelling…" : "Cancel"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => void refresh()}
        className="text-sm font-medium text-violet-700 underline"
      >
        Refresh
      </button>
    </section>
  );
}
