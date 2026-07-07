'use client'

import { useState, useEffect } from 'react'
import { useProgressStore } from '@/store/progress-logging'
import { useDashboardCopy } from '@/lib/dashboard/use-dashboard-copy'
import { FALLBACK_STORIES } from '@/lib/dashboard/fallback-stories'

export function StoryCarousel() {
  const userStories = useProgressStore((s) => s.stories)
  const copy = useDashboardCopy()

  const isFallback = userStories.length === 0

  const pool: Array<{ id: string; content: string; cta?: string }> = isFallback
    ? FALLBACK_STORIES
    : userStories.map((s) => ({ id: s.id, content: s.content }))

  const [index, setIndex] = useState(0)

  useEffect(() => {
    const randomStart = Math.floor(Math.random() * pool.length)
    setIndex(randomStart)
    // run once on mount — pool.length is stable within a render cycle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const current = pool[index % pool.length]

  function advance() {
    setIndex((i) => (i + 1) % pool.length)
  }

  return (
    <section aria-label={copy.story.heading} className="rounded-xl bg-white border border-ds-border-light shadow-card p-5 flex flex-col gap-3">
      <h2 className="text-xl font-semibold leading-7 text-ds-text-primary">
        {copy.story.heading}
      </h2>

      <blockquote className="text-[14px] leading-5 text-ds-text-primary italic">
        {current.content}
      </blockquote>

      {isFallback && current.cta && (
        <p className="text-[12px] text-accent font-medium">{current.cta}</p>
      )}

      {pool.length > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-[12px] text-ds-text-tertiary">
            {(index % pool.length) + 1} / {pool.length}
          </span>
          <button
            onClick={advance}
            className="
              min-h-11 px-2 text-[12px] text-ds-text-secondary hover:text-ds-text-primary
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ds-accent)/20
              transition-colors
            "
            aria-label="Next story"
          >
            {copy.story.nextLabel} →
          </button>
        </div>
      )}
    </section>
  )
}
