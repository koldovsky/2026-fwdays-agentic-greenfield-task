'use client'

import { useEmergencyInterceptStore } from '@/store/emergency-intercept'

export function useExitGuard() {
  const currentPhase = useEmergencyInterceptStore((s) => s.currentPhase)
  const closeModal = useEmergencyInterceptStore((s) => s.closeModal)

  const isWizardInProgress = currentPhase > 0 && currentPhase < 4

  function requestClose(onConfirmed?: () => void) {
    if (isWizardInProgress) {
      // caller must show the inline confirmation prompt; do not close yet
      onConfirmed?.()
    } else {
      closeModal()
    }
  }

  return { isWizardInProgress, requestClose, closeModal }
}
