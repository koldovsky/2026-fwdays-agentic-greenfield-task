// @trace FR-STATS-01
// @trace FR-STATS-02
//
// RED tests for StatsView — the pure, state-driven presentational view. It takes a
// discriminated-union state so the DESIGN §10 states are unit-testable WITHOUT a live
// fetch (the fetch/ownership lives in StatsPage, not tested here). Covers:
//  - loading  -> skeletons matching the final footprint, no layout shift (FR-STATS-02)
//  - error    -> a contained, retryable card, never a full-screen error (FR-STATS-01)
//  - empty    -> a calm first-run prompt with zeroed tiles, not blank/error (FR-STATS-01)
// plus the pure empty trigger `isEmptySnapshot` (strictly volume.all_time_min === 0; a
// snapshot with history but `building` zones is NOT empty). Fails now: ../StatsView
// (component + isEmptySnapshot export) does not exist yet.
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { sampleSnapshot } from '../__fixtures__/sampleSnapshot'
import StatsView, { isEmptySnapshot } from '../StatsView'

describe('StatsView loading state (FR-STATS-02)', () => {
  it('renders skeleton placeholders (tile + chart regions), no data and no error', () => {
    const { container } = render(<StatsView state={{ status: 'loading' }} />)
    // final-footprint skeletons for the tile and chart regions (layout-shift itself is a
    // visual property jsdom cannot measure; presence of the placeholders is asserted)
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByRole('button', { name: /retry|try again/i })).toBeNull()
    expect(screen.queryByText(/start your first session/i)).toBeNull()
  })
})

describe('StatsView error state (FR-STATS-01)', () => {
  it('renders a contained error card with a working retry control (not full-screen)', () => {
    const onRetry = vi.fn()
    const { container } = render(<StatsView state={{ status: 'error', onRetry }} />)

    const retry = screen.getByRole('button', { name: /retry|try again/i })
    expect(container.querySelector('[role="alert"], [class*="error"]')).not.toBeNull()

    fireEvent.click(retry)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})

describe('StatsView empty state (FR-STATS-01)', () => {
  it('renders the first-run prompt with zeroed tiles, not a blank or an error', () => {
    const { container } = render(<StatsView state={{ status: 'empty' }} />)
    expect(screen.getByText(/start your first session/i)).toBeTruthy()
    // it is not the error state
    expect(screen.queryByRole('button', { name: /retry|try again/i })).toBeNull()
    // tiles are present and read zero
    expect(screen.getByText(/today/i)).toBeTruthy()
    expect(container.textContent).toContain('0')
  })
})

describe('isEmptySnapshot (FR-STATS-01)', () => {
  it('is empty only when volume.all_time_min === 0', () => {
    const zero = { ...sampleSnapshot, volume: { ...sampleSnapshot.volume, all_time_min: 0 } }
    expect(isEmptySnapshot(zero)).toBe(true)
  })

  it('is NOT empty when there is history, even if every baseline zone is "building"', () => {
    const building = {
      ...sampleSnapshot,
      volume: { ...sampleSnapshot.volume, all_time_min: 120 },
      baselines: {
        volume: { value: 10, delta: null, zone: 'building' },
        consistency: { value: 0, delta: null, zone: 'building' },
        focus_share: { value: 0, delta: null, zone: 'building' },
        switch_load: { value: 0, delta: null, zone: 'building' },
      },
    }
    expect(isEmptySnapshot(building)).toBe(false)
  })
})
