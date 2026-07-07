'use client'

import { useEmergencyInterceptStore } from '@/store/emergency-intercept'
import { useWizardCopy } from '@/lib/emergency-intercept/use-wizard-copy'
import { FALLBACK_STORIES } from '@/lib/emergency-intercept/fallback-stories'
import { WIZARD_COPY } from '@/lib/emergency-intercept/copy'
import type { SuccessStory } from '@/store/progress-logging'

interface Story {
  id: string
  text: string
  attribution?: string
}

function useUserStories(): Story[] {
  try {
    const useProgressStore = require('@/store/progress-logging')?.useProgressStore
    const raw: SuccessStory[] = useProgressStore?.((s: { stories: SuccessStory[] }) => s.stories) ?? []
    return raw.map((s) => ({ id: s.id, text: s.content }))
  } catch {
    return []
  }
}

function pickStory(userStories: Story[]): Story {
  const pool = userStories.length > 0 ? userStories : FALLBACK_STORIES
  const idx = new Date().getDate() % pool.length
  return pool[idx]
}

interface Props {
  onDone: () => void
}

export function GroundingSummary({ onDone }: Props) {
  const copy = useWizardCopy()
  const phase1Answer = useEmergencyInterceptStore((s) => s.phase1Answer)
  const userStories = useUserStories()
  const story = pickStory(userStories)

  const emotionLabel = phase1Answer
    ? WIZARD_COPY.calm.phase1.options.find((o) => o.value === phase1Answer)?.label ?? ''
    : ''

  return (
    <div className="flex flex-col flex-1 px-6 py-8 gap-6">
      <div className="space-y-2">
        <h1 className="text-[28px] font-bold leading-10 text-ds-text-primary">{copy.summary.heading}</h1>
        <p className="text-[16px] leading-6 text-ds-text-secondary">{copy.summary.subheading}</p>
        {emotionLabel && (
          <p className="text-[12px] text-ds-text-tertiary">
            You identified feeling: <span className="font-semibold text-ds-text-secondary">{emotionLabel}</span>
          </p>
        )}
      </div>

      <div className="bg-ds-surface border border-ds-border-light rounded-xl p-5">
        <p className="text-[12px] font-semibold uppercase tracking-widest text-ds-text-tertiary mb-3">
          {copy.summary.storySectionLabel}
        </p>
        <p className="text-[14px] text-ds-text-primary leading-5 italic">"{story.text}"</p>
        {story.attribution && (
          <p className="text-[12px] text-ds-text-tertiary mt-2">— {story.attribution}</p>
        )}
      </div>

      <div className="mt-auto">
        <button
          onClick={onDone}
          className="
            w-full min-h-11 py-4 rounded-2xl bg-accent text-white font-bold text-[14px] leading-4.5
            hover:bg-accent-hover active:bg-accent-hover
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ds-accent)/20
            transition-colors duration-150
          "
        >
          {copy.summary.doneLabel}
        </button>
      </div>
    </div>
  )
}
