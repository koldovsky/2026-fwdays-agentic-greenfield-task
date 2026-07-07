'use client'

import { useDashboardCopy } from '@/lib/dashboard/use-dashboard-copy'

export function TopTasksPanel() {
  const copy = useDashboardCopy()

  return (
    <section aria-label={copy.tasks.heading} className="rounded-xl bg-white border border-ds-border-light shadow-card p-5 flex flex-col gap-3">
      <h2 className="text-xl font-semibold leading-7 text-ds-text-primary">
        {copy.tasks.heading}
      </h2>
      <ol className="flex flex-col gap-2">
        {copy.tasks.items.map((task, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-ds-surface text-ds-text-secondary text-[12px] font-semibold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <span className="text-[14px] leading-5 text-ds-text-primary">{task}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
