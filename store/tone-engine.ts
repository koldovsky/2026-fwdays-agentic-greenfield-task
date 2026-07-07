'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ToneMode } from '@/lib/emergency-intercept/copy'

interface ToneEngineState {
  activeToneMode: ToneMode
  setToneMode: (mode: ToneMode) => void
}

// Placeholder — the tone-engine capability will replace this store.
// emergency-intercept reads activeToneMode from here; defaulting to 'calm'.
export const useToneEngineStore = create<ToneEngineState>()(
  persist(
    (set) => ({
      activeToneMode: 'calm',
      setToneMode: (mode) => set({ activeToneMode: mode }),
    }),
    {
      name: 'tone-engine',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
