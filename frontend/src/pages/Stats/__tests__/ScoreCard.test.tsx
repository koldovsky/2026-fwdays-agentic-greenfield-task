// @trace FR-STATS-05
// @trace NFR-DES-01
//
// RED component tests for the metric ScoreCard. It reads one `baselines` entry
// {value, delta, zone} verbatim and renders:
//  - the value (big mono),
//  - the zone color via a token-mapped class keyed by the snapshot's `zone`
//    (green -> --zone-good, yellow -> --zone-warn, red -> --zone-bad), never a hex,
//  - the signed delta: `+N` with an up inline-SVG arrow when delta > 0, `-N` with a
//    down inline-SVG arrow when delta < 0, and a neutral `±0` with NO arrow at delta = 0,
//  - the neutral "building" chip (no zone color, no delta) when zone = "building" /
//    delta = null — nothing fabricated.
// Icons are inline <svg> (NFR-DES-01); no emoji appears. Fails now: ../ScoreCard missing.
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import ScoreCard from '../ScoreCard'

// Forbidden inline glyphs: emoji pictographs/dingbats/symbols/regional-indicators AND
// unicode arrows (arrows must be inline SVG, not a glyph). `±` (U+00B1), `+`, `-`, and
// digits are NOT in these ranges and remain allowed.
const FORBIDDEN_GLYPH_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u

describe('ScoreCard (FR-STATS-05)', () => {
  it('green zone + positive delta: value, token-mapped zone class, +N with an up SVG arrow', () => {
    const { container } = render(
      <ScoreCard label="Volume" entry={{ value: 120, delta: 15, zone: 'green' }} />,
    )
    expect(container.textContent).toContain('120')

    const zone = container.querySelector('[data-zone="green"]')
    expect(zone).not.toBeNull()
    // token-mapped class (e.g. zone-dot--green), not a hard-coded hex
    expect(zone?.getAttribute('class') ?? '').toMatch(/green/)
    expect(container.innerHTML).not.toContain('#34d399')

    expect(container.textContent).toMatch(/\+\s*15/)
    const up = container.querySelector('svg[data-direction="up"]')
    expect(up).not.toBeNull()
    expect(up?.tagName.toLowerCase()).toBe('svg')
    expect(container.querySelector('svg[data-direction="down"]')).toBeNull()
  })

  it('yellow zone + negative delta: token-mapped zone class, -N with a down SVG arrow', () => {
    const { container } = render(
      <ScoreCard label="Consistency" entry={{ value: 68, delta: -8, zone: 'yellow' }} />,
    )
    const zone = container.querySelector('[data-zone="yellow"]')
    expect(zone).not.toBeNull()
    expect(zone?.getAttribute('class') ?? '').toMatch(/yellow/)

    expect(container.textContent).toMatch(/-\s*8/)
    const down = container.querySelector('svg[data-direction="down"]')
    expect(down).not.toBeNull()
    expect(down?.tagName.toLowerCase()).toBe('svg')
    expect(container.querySelector('svg[data-direction="up"]')).toBeNull()
  })

  it('red zone + zero delta: token-mapped zone class, neutral ±0 with NO arrow', () => {
    const { container } = render(
      <ScoreCard label="Focus" entry={{ value: 30, delta: 0, zone: 'red' }} />,
    )
    const zone = container.querySelector('[data-zone="red"]')
    expect(zone).not.toBeNull()
    expect(zone?.getAttribute('class') ?? '').toMatch(/red/)

    expect(container.textContent).toContain('±0')
    // delta = 0 shows no direction arrow at all
    expect(container.querySelector('svg[data-direction]')).toBeNull()
  })

  it('building state: value + neutral building chip, NO zone color and NO delta (nothing fabricated)', () => {
    const { container } = render(
      <ScoreCard label="Switch load" entry={{ value: 45, delta: null, zone: 'building' }} />,
    )
    expect(container.textContent).toContain('45')
    expect(container.textContent).toMatch(/building/i)

    // no green/yellow/red zone color is applied for a still-forming baseline
    expect(
      container.querySelector('[data-zone="green"],[data-zone="yellow"],[data-zone="red"]'),
    ).toBeNull()
    // any zone marker present must read the verbatim "building", not a fabricated color
    const zone = container.querySelector('[data-zone]')
    if (zone) expect(zone.getAttribute('data-zone')).toBe('building')

    // no fabricated delta: no direction arrow, no signed number, no leaked null
    expect(container.querySelector('svg[data-direction]')).toBeNull()
    expect(container.textContent).not.toMatch(/[+±]\s*\d/)
    expect(container.textContent).not.toContain('null')
  })

  it('renders delta arrows as inline SVG and no emoji anywhere (NFR-DES-01)', () => {
    const { container } = render(
      <ScoreCard label="Volume" entry={{ value: 120, delta: 15, zone: 'green' }} />,
    )
    // the direction indicator is an <svg> element, not an emoji/glyph
    expect(container.querySelector('svg[data-direction="up"]')).not.toBeNull()
    expect(FORBIDDEN_GLYPH_RE.test(container.textContent ?? '')).toBe(false)
  })
})
