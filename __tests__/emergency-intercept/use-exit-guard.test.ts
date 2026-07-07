import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockClose = vi.fn()

vi.mock('../../store/emergency-intercept', () => ({
  useEmergencyInterceptStore: vi.fn(),
}))

import { useEmergencyInterceptStore } from '../../store/emergency-intercept'
import { useExitGuard } from '../../lib/emergency-intercept/use-exit-guard'

const mockUse = useEmergencyInterceptStore as unknown as ReturnType<typeof vi.fn>

function mockPhase(phase: number) {
  mockUse.mockImplementation(
    (selector: (s: { currentPhase: number; closeModal: () => void }) => unknown) =>
      selector({ currentPhase: phase, closeModal: mockClose })
  )
}

describe('useExitGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('isWizardInProgress is false at phase 0 (not started)', () => {
    mockPhase(0)
    const { isWizardInProgress } = useExitGuard()
    expect(isWizardInProgress).toBe(false)
  })

  it('isWizardInProgress is true at phase 1 (mid-wizard)', () => {
    mockPhase(1)
    const { isWizardInProgress } = useExitGuard()
    expect(isWizardInProgress).toBe(true)
  })

  it('isWizardInProgress is true at phase 2 (mid-wizard)', () => {
    mockPhase(2)
    const { isWizardInProgress } = useExitGuard()
    expect(isWizardInProgress).toBe(true)
  })

  it('isWizardInProgress is true at phase 3 (mid-wizard)', () => {
    mockPhase(3)
    const { isWizardInProgress } = useExitGuard()
    expect(isWizardInProgress).toBe(true)
  })

  it('isWizardInProgress is false at phase 4 (summary — wizard complete)', () => {
    mockPhase(4)
    const { isWizardInProgress } = useExitGuard()
    expect(isWizardInProgress).toBe(false)
  })

  it('requestClose calls closeModal directly when not mid-wizard (phase 0)', () => {
    mockPhase(0)
    const { requestClose } = useExitGuard()
    requestClose()
    expect(mockClose).toHaveBeenCalledOnce()
  })

  it('requestClose calls provided callback (confirmation gate) when mid-wizard', () => {
    mockPhase(2)
    const onConfirmed = vi.fn()
    const { requestClose } = useExitGuard()
    requestClose(onConfirmed)
    expect(onConfirmed).toHaveBeenCalledOnce()
    expect(mockClose).not.toHaveBeenCalled()
  })

  it('requestClose calls closeModal directly from summary screen (phase 4)', () => {
    mockPhase(4)
    const { requestClose } = useExitGuard()
    requestClose()
    expect(mockClose).toHaveBeenCalledOnce()
  })
})
