// @trace FR-STATS-01
// @trace FR-STATS-05
// @trace NFR-DES-01
//
// RED composition test: StatsView in the `loaded` state routes to the real content —
// summary tiles (FR-STATS-01), the four zoned score cards + the M5 streak card
// (FR-STATS-05) — and no emoji appears anywhere on the page (NFR-DES-01). The Chart.js
// wrappers need a canvas jsdom lacks, so the three chart components are mocked to no-ops
// here (their data logic is covered by the toBarData/toDonutData/toLineData tests); the
// tiles and score cards render for real. Fails now: ../StatsView does not exist yet.
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { sampleSnapshot } from '../__fixtures__/sampleSnapshot'

vi.mock('../BarByDay', () => ({ default: () => null, toBarData: () => [] }))
vi.mock('../DonutByCategory', () => ({ default: () => null, toDonutData: () => [] }))
vi.mock('../CategoryLine', () => ({ default: () => null, toLineData: () => [] }))

import StatsView from '../StatsView'

const FORBIDDEN_GLYPH_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u

describe('StatsView loaded state (FR-STATS-01, FR-STATS-05, NFR-DES-01)', () => {
  it('composes tiles + zoned score cards + streak, and shows no other state', () => {
    const { container } = render(
      <StatsView state={{ status: 'loaded', snapshot: sampleSnapshot }} />,
    )

    // summary tiles read the snapshot volume/streak
    expect(screen.getByText(/today/i)).toBeTruthy()
    expect(container.textContent).toContain('2048') // all_time_min
    expect(container.textContent).toContain('42') // today_min

    // the four baselines route to zoned score cards; switch_load is "building"
    expect(container.querySelector('[data-zone="green"]')).not.toBeNull() // volume / focus_share
    expect(container.querySelector('[data-zone="yellow"]')).not.toBeNull() // consistency
    expect(screen.getAllByText(/building/i).length).toBeGreaterThanOrEqual(1) // switch_load

    // an M5 streak surface exists on the page
    expect(screen.getAllByText(/streak/i).length).toBeGreaterThanOrEqual(1)

    // loaded is not loading / error / empty
    expect(container.querySelector('.skeleton')).toBeNull()
    expect(screen.queryByRole('button', { name: /retry|try again/i })).toBeNull()
    expect(screen.queryByText(/start your first session/i)).toBeNull()
  })

  it('renders no emoji anywhere on the page (NFR-DES-01)', () => {
    const { container } = render(
      <StatsView state={{ status: 'loaded', snapshot: sampleSnapshot }} />,
    )
    expect(FORBIDDEN_GLYPH_RE.test(container.textContent ?? '')).toBe(false)
  })
})
