// @trace FR-STATS-01
//
// RED component test for the Stats summary tiles. Scenario "Tiles render the snapshot
// values": the Today / This Week / This Month / All-time / Streak tiles each show the
// corresponding `volume` / `streaks` value read directly from the snapshot, recomputing
// nothing. Fails now because ../SummaryTiles does not exist yet (missing module).
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { sampleSnapshot } from '../__fixtures__/sampleSnapshot'
import SummaryTiles from '../SummaryTiles'

describe('SummaryTiles (FR-STATS-01)', () => {
  // volume: today 42, week 176, month 531, all-time 2048 (each digit-distinct so a
  // substring match maps to exactly one tile). per_day sums to 42, so week_min=176
  // appearing proves the tile reads the snapshot field and does not re-sum per_day.
  const volume = sampleSnapshot.volume
  const streaks = { current: 9, longest: 12 }

  it('renders all five tile labels', () => {
    render(<SummaryTiles volume={volume} streaks={streaks} />)
    expect(screen.getByText(/today/i)).toBeTruthy()
    expect(screen.getByText(/this week/i)).toBeTruthy()
    expect(screen.getByText(/this month/i)).toBeTruthy()
    expect(screen.getByText(/all[-\s]?time/i)).toBeTruthy()
    expect(screen.getByText(/streak/i)).toBeTruthy()
  })

  it('shows each snapshot value verbatim (recomputes nothing)', () => {
    const { container } = render(<SummaryTiles volume={volume} streaks={streaks} />)
    const text = container.textContent ?? ''
    expect(text).toContain('42') // today_min
    expect(text).toContain('176') // week_min (NOT the per_day sum of 42)
    expect(text).toContain('531') // month_min
    expect(text).toContain('2048') // all_time_min
    expect(text).toContain('9') // streaks.current
  })
})
