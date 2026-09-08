// @trace FR-STATS-05
//
// RED component test for the M5 streak card. Scenario "The streak card renders from
// streaks.current without a baseline zone": the shipped slice-004 snapshot exposes NO
// `baselines.streak`, so the streak card is a PLAIN value card from `streaks.current` —
// no zone color and no baseline delta are fabricated. Fails now: ../StreakCard missing.
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import StreakCard from '../StreakCard'

describe('StreakCard (FR-STATS-05)', () => {
  it('shows streaks.current as a plain value with a streak label', () => {
    const { container } = render(<StreakCard streak={12} />)
    expect(container.textContent).toContain('12')
    expect(screen.getByText(/streak/i)).toBeTruthy()
  })

  it('fabricates no zone color and no baseline delta', () => {
    const { container } = render(<StreakCard streak={12} />)
    // no zone dot/bar of any zone
    expect(container.querySelector('[data-zone]')).toBeNull()
    // no signed delta and no up/down direction arrow
    expect(container.querySelector('svg[data-direction]')).toBeNull()
    expect(container.textContent).not.toMatch(/[+±]\s*\d/)
  })
})
