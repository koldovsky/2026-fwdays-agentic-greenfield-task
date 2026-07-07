'use client'

import { useProgressStore } from '@/store/progress-logging'
import { useDashboardCopy } from '@/lib/dashboard/use-dashboard-copy'

export function MetricsPanel() {
  const currentStreak = useProgressStore((s) => s.currentStreak)
  const lifetimeDays = useProgressStore((s) => s.lifetimeDays)
  const copy = useDashboardCopy()

  return (
    <section
      aria-label={copy.metrics.heading}
      className="rounded-xl bg-white border border-ds-border-light shadow-card p-5 flex flex-col gap-4"
    >
      <h2 className="text-xl font-semibold leading-7 text-ds-text-primary">
        {copy.metrics.heading}
      </h2>
      <div className="flex gap-6">
        <div className="flex flex-col items-center">
          <span className="text-4xl font-bold text-accent tabular-nums">{currentStreak}</span>
          <span className="text-[12px] text-ds-text-secondary mt-1 text-center">{copy.metrics.streakLabel}</span>
        </div>
        <div className="w-px bg-ds-border-light" aria-hidden />
        <div className="flex flex-col items-center">
          <span className="text-4xl font-bold text-accent tabular-nums">{lifetimeDays}</span>
          <span className="text-[12px] text-ds-text-secondary mt-1 text-center">{copy.metrics.lifetimeLabel}</span>
        </div>
      </div>
    </section>
  )
}
