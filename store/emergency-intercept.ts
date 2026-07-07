'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Emotion = 'sad' | 'anxious' | 'frustrated' | 'guilty'

interface SteppDraftState {
  isEmergencyModalOpen: boolean
  currentPhase: 0 | 1 | 2 | 3 | 4
  phase1Answer: Emotion | null
  phase2Answers: string[]
  phase3Answers: string[]
  isDraft: boolean

  openModal: () => void
  closeModal: () => void
  setPhase: (phase: 0 | 1 | 2 | 3 | 4) => void
  setPhase1Answer: (answer: Emotion) => void
  setPhase2Answers: (answers: string[]) => void
  setPhase3Answers: (answers: string[]) => void
  resetDraft: () => void
}

const initialDraftState = {
  currentPhase: 0 as const,
  phase1Answer: null,
  phase2Answers: [] as string[],
  phase3Answers: [] as string[],
  isDraft: false,
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

export const useEmergencyInterceptStore = create<SteppDraftState>()(
  persist(
    (set) => ({
      isEmergencyModalOpen: false,
      ...initialDraftState,

      openModal: () => set({ isEmergencyModalOpen: true }),
      closeModal: () => set({ isEmergencyModalOpen: false }),

      setPhase: (phase) => set({ currentPhase: phase, isDraft: phase > 0 }),

      setPhase1Answer: (answer) =>
        set({ phase1Answer: answer, isDraft: true }),

      setPhase2Answers: (answers) =>
        set({ phase2Answers: answers, isDraft: true }),

      setPhase3Answers: (answers) =>
        set({ phase3Answers: answers, isDraft: true }),

      resetDraft: () =>
        set({ ...initialDraftState, isEmergencyModalOpen: false }),
    }),
    {
      name: 'stepp-draft',
      storage: makeStorage(),
      partialize: (state) => ({
        currentPhase: state.currentPhase,
        phase1Answer: state.phase1Answer,
        phase2Answers: state.phase2Answers,
        phase3Answers: state.phase3Answers,
        isDraft: state.isDraft,
      }),
    }
  )
)
