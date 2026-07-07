'use client'

import { useProgressStore } from '@/store/progress-logging'
import { useProgressCopy } from '@/lib/progress-logging/use-progress-copy'

export function WinsList() {
  const stories = useProgressStore((s) => s.stories)
  const copy = useProgressCopy()

  if (stories.length === 0) return null

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{copy.story.heading}</h2>

      <ul className="flex flex-col gap-3">
        {stories.map((story) => (
          <li
            key={story.id}
            className="rounded-xl border border-gray-100 bg-zinc-50 px-4 py-3 text-sm text-gray-800 leading-relaxed"
          >
            <p>{story.content}</p>
            <time
              dateTime={story.createdAt}
              className="mt-1 block text-xs text-gray-400"
            >
              {new Date(story.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </time>
          </li>
        ))}
      </ul>
    </div>
  )
}
