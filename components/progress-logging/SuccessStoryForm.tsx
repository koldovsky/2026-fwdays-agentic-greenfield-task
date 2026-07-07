'use client'

import { useState } from 'react'
import { useProgressStore } from '@/store/progress-logging'
import { useProgressCopy } from '@/lib/progress-logging/use-progress-copy'

export function SuccessStoryForm() {
  const copy = useProgressCopy()
  const addStory = useProgressStore((s) => s.addStory)
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    addStory({
      id: `story-${Date.now()}`,
      content: trimmed,
      createdAt: new Date().toISOString(),
    })
    setText('')
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-ds-border-light bg-white p-6 shadow-card">
      <h2 className="text-xl font-semibold leading-7 text-ds-text-primary">{copy.story.heading}</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={copy.story.placeholder}
          rows={4}
          className="
            w-full resize-none rounded-lg border border-ds-border-medium px-4 py-3
            text-[14px] text-ds-text-primary placeholder:text-ds-text-tertiary
            focus:outline-none focus:ring-[3px] focus:ring-(--ds-accent)/10 focus:border-accent
            transition duration-150
          "
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="
            w-full min-h-11 py-3 rounded-xl bg-accent text-white font-semibold text-[14px] leading-4.5
            hover:bg-accent-hover active:bg-accent-hover
            disabled:opacity-40 disabled:cursor-not-allowed
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ds-accent)/20
            transition-colors duration-150
          "
        >
          {copy.story.submitLabel}
        </button>
      </form>

      {saved && (
        <p className="text-[14px] text-accent font-medium">{copy.story.successMessage}</p>
      )}
    </div>
  )
}
