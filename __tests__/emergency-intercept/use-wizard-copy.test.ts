import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WIZARD_COPY } from '../../lib/emergency-intercept/copy'

// Mock the tone-engine store so useWizardCopy returns a controllable mode.
vi.mock('../../store/tone-engine', () => ({
  useToneEngineStore: vi.fn(),
}))

import { useToneEngineStore } from '../../store/tone-engine'
import { useWizardCopy } from '../../lib/emergency-intercept/use-wizard-copy'

const mockUse = useToneEngineStore as unknown as ReturnType<typeof vi.fn>

describe('useWizardCopy', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns calm copy when activeToneMode is "calm"', () => {
    mockUse.mockImplementation((selector: (s: { activeToneMode: string }) => string) =>
      selector({ activeToneMode: 'calm' })
    )
    const copy = useWizardCopy()
    expect(copy).toStrictEqual(WIZARD_COPY.calm)
  })

  it('returns rational copy when activeToneMode is "rational"', () => {
    mockUse.mockImplementation((selector: (s: { activeToneMode: string }) => string) =>
      selector({ activeToneMode: 'rational' })
    )
    const copy = useWizardCopy()
    expect(copy).toStrictEqual(WIZARD_COPY.rational)
  })

  it('returns auntie copy when activeToneMode is "auntie"', () => {
    mockUse.mockImplementation((selector: (s: { activeToneMode: string }) => string) =>
      selector({ activeToneMode: 'auntie' })
    )
    const copy = useWizardCopy()
    expect(copy).toStrictEqual(WIZARD_COPY.auntie)
  })

  it('defaults to calm copy when activeToneMode is undefined', () => {
    mockUse.mockImplementation((selector: (s: { activeToneMode: undefined }) => undefined) =>
      selector({ activeToneMode: undefined })
    )
    const copy = useWizardCopy()
    expect(copy).toStrictEqual(WIZARD_COPY.calm)
  })

  it('calm copy contains no exclamation marks (BC-BRAND-01)', () => {
    mockUse.mockImplementation((selector: (s: { activeToneMode: string }) => string) =>
      selector({ activeToneMode: 'calm' })
    )
    const copy = useWizardCopy()
    const allText = JSON.stringify(copy)
    expect(allText).not.toContain('!')
  })

  it('auntie copy contains at least one exclamation mark (BC-BRAND-01)', () => {
    mockUse.mockImplementation((selector: (s: { activeToneMode: string }) => string) =>
      selector({ activeToneMode: 'auntie' })
    )
    const copy = useWizardCopy()
    const allText = JSON.stringify(copy)
    expect(allText).toContain('!')
  })
})
