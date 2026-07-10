// reader-css mapping + SECURITY (ch8). buildReadingCss is the TRUST BOUNDARY for preference data crossing
// the postMessage bridge: at runtime it is untrusted structured data. These tests pin the mapping (themes,
// typefaces, pt clamp, spacing, flow) AND prove the injection class is closed — a non-allowlisted font
// value can never appear in the emitted CSS.

import { describe, expect, it } from 'vitest'
import type { ReadingPreferences } from '@/core/model'
import { buildReadingCss, flowMode } from './reader-css'

/** Build CSS from a possibly-untyped (raw-bridge-shaped) preference object. */
function css(prefs: Record<string, unknown>): string {
  return buildReadingCss(prefs as ReadingPreferences)
}

describe('buildReadingCss — themes', () => {
  it('emits each theme background/foreground with !important so the reader wins the publisher cascade', () => {
    expect(css({ theme: 'light' })).toContain('background: #faf8f3 !important')
    expect(css({ theme: 'sepia' })).toContain('background: #f1e7d0 !important')
    expect(css({ theme: 'dark' })).toContain('background: #1b1714 !important')
    expect(css({ theme: 'parchment' })).toContain('background: #d9d0b0 !important')
    // foreground + the html, body selector
    expect(css({ theme: 'dark' })).toMatch(
      /html, body \{ background: #1b1714 !important; color: #e7e1d4 !important; \}/,
    )
  })

  it('emits nothing for an empty preference set', () => {
    expect(css({})).toBe('')
  })
})

describe('buildReadingCss — typeface (closed union -> safe stacks)', () => {
  it('maps each typeface to its known font stack', () => {
    expect(css({ typeface: 'newsreader' })).toContain("font-family: 'Newsreader'")
    expect(css({ typeface: 'literata' })).toContain("font-family: 'Literata'")
    expect(css({ typeface: 'sans' })).toContain('font-family: ui-sans-serif')
  })
})

describe('buildReadingCss — text size (pt -> % of a pinned 12pt base, clamped [10,40])', () => {
  it('maps the default 17pt to 142%', () => {
    expect(css({ textSizePt: 17 })).toContain('font-size: 142% !important')
  })
  it('clamps below the minimum to 10pt (83%)', () => {
    expect(css({ textSizePt: 4 })).toContain('font-size: 83% !important')
  })
  it('clamps above the maximum to 40pt (333%)', () => {
    expect(css({ textSizePt: 1000 })).toContain('font-size: 333% !important')
  })
  it('coerces a NON-numeric size to the default (never interpolates the raw value)', () => {
    const out = css({ textSizePt: '24; } body { display: none } /*' })
    expect(out).toContain('font-size: 142% !important') // NaN -> DEFAULT_PT (17) -> 142%
    expect(out).not.toContain('display: none')
    expect(out).not.toContain('24;')
  })
})

describe('buildReadingCss — spacing density', () => {
  it('maps each preset to its line-height and paragraph gap', () => {
    expect(css({ spacing: 'compact' })).toContain('line-height: 1.4 !important')
    expect(css({ spacing: 'cozy' })).toContain('line-height: 1.6 !important')
    expect(css({ spacing: 'relaxed' })).toContain('line-height: 1.9 !important')
    expect(css({ spacing: 'relaxed' })).toContain('margin-block: 1.25em !important')
  })
})

describe('buildReadingCss — SECURITY: a fontFamily value can never inject CSS', () => {
  const ATTACKS = [
    'expression(alert(1))',
    "'; color: red; } body { background: url('//evil') } /*",
    'Arial; } * { display: none }',
    'constructor', // prototype-key probe — must not resolve via the allowlist
    '__proto__',
    'url(javascript:alert(1))',
  ]

  it('drops every non-allowlisted fontFamily (the attack string never appears in output)', () => {
    for (const attack of ATTACKS) {
      const out = css({ fontFamily: attack })
      expect(out, `attack must be dropped: ${attack}`).toBe('')
      expect(out).not.toContain(attack)
    }
  })

  it('drops a non-allowlisted fontFamily even alongside a valid theme (theme stays, font dropped)', () => {
    const out = css({ theme: 'sepia', fontFamily: 'expression(alert(1))' })
    expect(out).toContain('background: #f1e7d0 !important') // the valid theme still applies
    expect(out).not.toContain('expression')
    expect(out).not.toContain('font-family')
  })

  it('honours an EXACT legacy family from the allowlist (defense-in-depth, mapped to a safe stack)', () => {
    expect(css({ fontFamily: 'Literata' })).toContain("font-family: 'Literata'")
    expect(css({ fontFamily: 'Newsreader' })).toContain("font-family: 'Newsreader'")
    // a near-miss (wrong case / extra chars) is NOT allowlisted
    expect(css({ fontFamily: 'literata' })).toBe('')
    expect(css({ fontFamily: 'Literata, serif' })).toBe('')
  })

  it('prefers the typeface union over any legacy fontFamily', () => {
    const out = css({ typeface: 'sans', fontFamily: 'Literata' })
    expect(out).toContain('ui-sans-serif')
    expect(out).not.toContain('Literata')
  })
})

describe('flowMode', () => {
  it('maps layout to the foliate flow', () => {
    expect(flowMode({ layout: 'scroll' })).toBe('scrolled')
    expect(flowMode({ layout: 'paged' })).toBe('paginated')
  })
  it('defaults to paginated when layout is absent', () => {
    expect(flowMode({})).toBe('paginated')
    expect(flowMode({ theme: 'dark' })).toBe('paginated')
  })
  it('honours a legacy scroll boolean from raw bridge data', () => {
    expect(flowMode({ scroll: true } as unknown as ReadingPreferences)).toBe('scrolled')
    expect(flowMode({ scroll: false } as unknown as ReadingPreferences)).toBe('paginated')
  })
})
