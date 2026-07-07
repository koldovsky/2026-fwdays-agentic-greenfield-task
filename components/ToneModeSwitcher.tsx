'use client'

import { useToneEngineStore } from '@/store/tone-engine'
import type { ToneMode } from '@/lib/emergency-intercept/copy'

const MODES: { value: ToneMode; label: string }[] = [
  { value: 'calm', label: 'Zen' },
  { value: 'rational', label: 'Blueprint' },
  { value: 'auntie', label: 'Auntie' },
]

export function ToneModeSwitcher() {
  const { activeToneMode, setToneMode } = useToneEngineStore()

  return (
    <div
      role="group"
      aria-label="Tone mode"
      className="flex gap-1 rounded-full bg-ds-surface p-1"
    >
      {MODES.map((mode) => (
        <button
          key={mode.value}
          onClick={() => setToneMode(mode.value)}
          aria-pressed={activeToneMode === mode.value}
          className={`
            min-h-[44px] px-3 rounded-full text-[14px] font-semibold leading-[18px]
            transition-colors duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)]/20
            ${activeToneMode === mode.value
              ? 'bg-accent text-white'
              : 'text-ds-text-secondary hover:text-ds-text-primary'
            }
          `}
        >
          {mode.label}
        </button>
      ))}
    </div>
  )
}
