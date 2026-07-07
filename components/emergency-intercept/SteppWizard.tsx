'use client'

import { useEmergencyInterceptStore } from '@/store/emergency-intercept'
import { SteppPhase1 } from './SteppPhase1'
import { SteppPhase2 } from './SteppPhase2'
import { SteppPhase3 } from './SteppPhase3'
import { GroundingSummary } from './GroundingSummary'

// Phase map:
//  0 = intro / not started (wizard renders intro screen)
//  1 = Phase 1 (Situation/Thought/Emotion)
//  2 = Phase 2 (Physical Sensations)
//  3 = Phase 3 (Performance/Precautions)
//  4 = Grounding Summary (complete)

export function SteppWizard() {
  const currentPhase = useEmergencyInterceptStore((s) => s.currentPhase)
  const setPhase = useEmergencyInterceptStore((s) => s.setPhase)
  const resetDraft = useEmergencyInterceptStore((s) => s.resetDraft)

  // On modal open, draft hydrates from localStorage automatically via zustand/persist.
  // currentPhase > 0 means a draft is in progress — SteppWizard renders straight to that phase.

  function handleDone() {
    resetDraft()
  }

  if (currentPhase === 4) {
    return <GroundingSummary onDone={handleDone} />
  }

  if (currentPhase === 3) {
    return (
      <SteppPhase3
        onSubmit={() => setPhase(4)}
        onBack={() => setPhase(2)}
      />
    )
  }

  if (currentPhase === 2) {
    return (
      <SteppPhase2
        onNext={() => setPhase(3)}
        onBack={() => setPhase(1)}
      />
    )
  }

  if (currentPhase === 1) {
    return (
      <SteppPhase1
        onNext={() => setPhase(2)}
      />
    )
  }

  // Phase 0 — intro screen, not yet started
  return <WizardIntro onStart={() => setPhase(1)} />
}

function WizardIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-12 gap-6 text-center">
      <div className="text-6xl" aria-hidden="true">🛑</div>
      <div className="space-y-2 max-w-xs">
        <h2 className="text-xl font-bold text-gray-900">You pressed STOP.</h2>
        <p className="text-sm text-gray-500">
          That took courage. Let's take a moment to understand what's happening right now.
        </p>
      </div>
      <button
        onClick={onStart}
        className="
          mt-4 w-full max-w-xs py-4 rounded-2xl bg-red-700 text-white font-bold text-base
          hover:bg-red-800 active:bg-red-900
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400
          transition-colors duration-150
        "
      >
        Begin reflection
      </button>
    </div>
  )
}
