'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface SuccessStory {
  id: string
  content: string
  createdAt: string
}

interface ProgressState {
  currentStreak: number
  lifetimeDays: number
  todayCheckedIn: boolean
  lastCheckedInDate: string | null
  stories: SuccessStory[]

  setProgressState: (state: Partial<Pick<ProgressState, 'currentStreak' | 'lifetimeDays' | 'todayCheckedIn' | 'lastCheckedInDate'>>) => void
  optimisticCheckIn: (today: string, newStreak: number) => void
  addStory: (story: SuccessStory) => void
}

function makeStorage() {
  try {
    return createJSONStorage(() => localStorage)
  } catch {
    return createJSONStorage(() => ({
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }))
  }
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      currentStreak: 0,
      lifetimeDays: 0,
      todayCheckedIn: false,
      lastCheckedInDate: null,
      stories: [],

      setProgressState: (partial) => set(partial),

      optimisticCheckIn: (today, newStreak) =>
        set((s) => ({
          todayCheckedIn: true,
          lastCheckedInDate: today,
          currentStreak: newStreak,
          lifetimeDays: s.lifetimeDays + 1,
        })),

      addStory: (story) =>
        set((s) => ({ stories: [story, ...s.stories] })),
    }),
    {
      name: 'progress-logging',
      storage: makeStorage(),
      partialize: (state) => ({
        currentStreak: state.currentStreak,
        lifetimeDays: state.lifetimeDays,
        todayCheckedIn: state.todayCheckedIn,
        lastCheckedInDate: state.lastCheckedInDate,
        stories: state.stories,
      }),
    }
  )
)
