// ReadingPreferences: the shared, serializable reading-preference vocabulary in core/model. It must be
// plain JSON-native data (round-trips identically) so it crosses the reader bridge and the future native
// client re-expresses it; `theme`/`typeface`/`layout`/`spacing` are closed sets; partial updates are valid
// (every field optional). add-reading-preferences (change 8) adopted ONE clean vocabulary
// (theme/typeface/textSizePt/layout/spacing/rtl) — no parallel legacy aliases — so this guards that shape.

import { describe, expect, it } from 'vitest'
import type { ReadingPreferences } from '@/core/model'

describe('ReadingPreferences — serializable vocabulary', () => {
  it('round-trips through JSON and structuredClone unchanged', () => {
    const prefs: ReadingPreferences = {
      theme: 'parchment',
      typeface: 'literata',
      textSizePt: 20,
      layout: 'scroll',
      spacing: 'relaxed',
      rtl: false,
    }
    expect(JSON.parse(JSON.stringify(prefs))).toEqual(prefs)
    expect(structuredClone(prefs)).toEqual(prefs)
    // Plain data: no prototype methods, no class instance.
    expect(Object.getPrototypeOf(prefs)).toBe(Object.prototype)
  })

  it('accepts every theme in the closed set', () => {
    const themes: ReadonlyArray<NonNullable<ReadingPreferences['theme']>> = [
      'light',
      'sepia',
      'dark',
      'parchment',
    ]
    for (const theme of themes) {
      const prefs: ReadingPreferences = { theme }
      expect(prefs.theme).toBe(theme)
      expect(JSON.parse(JSON.stringify(prefs)).theme).toBe(theme)
    }
  })

  it('accepts every typeface, layout, and spacing token in its closed set', () => {
    const typefaces: ReadonlyArray<NonNullable<ReadingPreferences['typeface']>> = [
      'newsreader',
      'literata',
      'sans',
    ]
    const layouts: ReadonlyArray<NonNullable<ReadingPreferences['layout']>> = ['paged', 'scroll']
    const spacings: ReadonlyArray<NonNullable<ReadingPreferences['spacing']>> = [
      'compact',
      'cozy',
      'relaxed',
    ]
    for (const typeface of typefaces) expect({ typeface }.typeface).toBe(typeface)
    for (const layout of layouts) expect({ layout }.layout).toBe(layout)
    for (const spacing of spacings) expect({ spacing }.spacing).toBe(spacing)
  })

  it('allows a partial update (every field optional)', () => {
    const onlySize: ReadingPreferences = { textSizePt: 18 }
    expect(onlySize).toEqual({ textSizePt: 18 })

    const empty: ReadingPreferences = {}
    expect(Object.keys(empty)).toHaveLength(0)

    const merged: ReadingPreferences = { ...onlySize, theme: 'dark' }
    expect(merged).toEqual({ textSizePt: 18, theme: 'dark' })
  })
})
