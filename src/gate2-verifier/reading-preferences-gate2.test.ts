// Gate-2 INDEPENDENT verifier tests for add-reading-preferences (ch8, attempt 1).
// Written by the checker — fully independent from the maker's test files. Uses no shared helpers.
// Covers: (a) CSS injection, (b) persistence round-trip + prototype-pollution, (c) ADR-001 snapshot,
// (d) theme/typeface/spacing/size CSS mappings.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { isReactive, reactive, toRaw } from 'vue'
import type { ReadingPreferences } from '@/core/model'
import { buildReadingCss, flowMode } from '@/platform/web/reader-frame/reader-css'
import { useReaderPreferencesStore } from '@/app/stores/readerPreferencesStore'

// ─── (a) CSS injection ─────────────────────────────────────────────────────────────────────────────

describe('Gate-2 — CSS injection: hostile values NEVER appear in buildReadingCss output', () => {
  // Wrap as untrusted runtime bridge data (the exact same cast the module uses internally).
  function raw(obj: Record<string, unknown>): string {
    return buildReadingCss(obj as ReadingPreferences)
  }

  // fontFamily attack vectors — cover expression(), style-break, url(js:), __proto__ key probes.
  const FONT_ATTACKS: [string, string][] = [
    ['expression(x)', 'CSS expression injection'],
    ['</style><script>alert(1)</script>', 'HTML injection into style'],
    ['; }html{display:none}', 'CSS rule break'],
    ['Arial,sans-serif', 'non-allowlisted font stack (multiple values)'],
    ['constructor', 'prototype-key probe via constructor'],
    ['__proto__', 'prototype-key probe via __proto__'],
    ['url(javascript:alert(1))', 'javascript-url injection'],
    ['expression(document.cookie)', 'expression with property access'],
    ['\\22 ), * {color:red} (', 'backslash encoding attack'],
    ['Newsreader; font-size: 9999px', 'Newsreader with semicolon injection (not exact match)'],
  ]

  for (const [attack, label] of FONT_ATTACKS) {
    it(`drops fontFamily: "${label}" — no hostile substring in output`, () => {
      const out = raw({ fontFamily: attack })
      // The raw attack string itself must not appear in the output.
      expect(out, `attack payload leaked: ${label}`).not.toContain(attack)
      // Specifically: no font-family rule at all when the only field is a hostile fontFamily.
      expect(out, `font-family must be dropped for: ${label}`).not.toContain('font-family')
    })
  }

  it('drops a non-allowlisted fontFamily alongside a valid theme — theme emits, font does not', () => {
    const out = raw({ theme: 'dark', fontFamily: 'expression(alert(1))' })
    // The valid theme must still render.
    expect(out).toContain('#1b1714')
    // The attack must not appear anywhere.
    expect(out).not.toContain('expression')
    expect(out).not.toContain('font-family')
  })

  it('a non-allowlisted case-variant of a known family is dropped ("literata" lowercase)', () => {
    const out = raw({ fontFamily: 'literata' }) // case-sensitive allowlist
    expect(out).toBe('')
  })

  it('drops an invalid typeface token — non-enum string not in output', () => {
    const out = raw({ typeface: 'Comic Sans' as never })
    expect(out).not.toContain('Comic')
    expect(out).not.toContain('font-family')
  })

  it('coerces a textSizePt string injection to the safe default (142%) — raw attack not emitted', () => {
    const out = raw({ textSizePt: '999; } * { display:none }' as never })
    // NaN from the coercion → DEFAULT_PT → 142%
    expect(out).toContain('142% !important')
    expect(out).not.toContain('display:none')
    expect(out).not.toContain('display: none')
  })

  it('clamps a huge positive textSizePt to MAX_PT → 333% (40pt/12 = 333%)', () => {
    expect(raw({ textSizePt: 1e9 })).toContain('333% !important')
  })

  it('clamps a negative textSizePt to MIN_PT → 83% (10pt/12 ≈ 83%)', () => {
    expect(raw({ textSizePt: -999 })).toContain('83% !important')
  })

  it('handles NaN textSizePt → default 142%', () => {
    expect(raw({ textSizePt: NaN })).toContain('142% !important')
  })

  it('an entirely hostile/unknown object emits only safe values — no raw attack string appears, no throw', () => {
    const hostile = {
      fontFamily: 'expression(alert(1))',
      typeface: 'impact' as never,
      textSizePt: NaN, // NaN → DEFAULT_PT (17) → safe 142%
      theme: 'rainbow' as never,
      spacing: 'ultra-loose' as never,
    }
    const out = raw(hostile)
    // NaN textSizePt → DEFAULT_PT → 142% (safe fallback, no raw NaN or attack string emitted).
    expect(out).toContain('142% !important')
    // The hostile fontFamily must not appear.
    expect(out).not.toContain('expression')
    expect(out).not.toContain('font-family')
    // Unknown typeface, theme, spacing → no rule for those (closed-set validation drops them).
    expect(out).not.toContain('impact')
    expect(out).not.toContain('rainbow')
    expect(out).not.toContain('ultra-loose')
    // No injection payload in output at all.
    expect(out).not.toContain('alert')
  })

  it('a spacing injection string resolves to empty (no spacing rule emitted for unknown preset)', () => {
    const out = raw({ spacing: 'wide; color:red' as never })
    expect(out).not.toContain('color:red')
    expect(out).not.toContain('line-height')
  })
})

// ─── (d) CSS mapping verification (independent constants) ────────────────────────────────────────────

describe('Gate-2 — CSS mapping: each setting produces the expected output', () => {
  function css(prefs: Partial<ReadingPreferences>): string {
    return buildReadingCss(prefs as ReadingPreferences)
  }

  it('light theme → warm near-white bg + dark fg', () => {
    const out = css({ theme: 'light' })
    expect(out).toContain('#faf8f3')
    expect(out).toContain('#2b2a26')
    expect(out).toContain('!important')
  })

  it('sepia theme → warm cream bg', () => {
    expect(css({ theme: 'sepia' })).toContain('#f1e7d0')
  })

  it('dark theme → near-black bg + light fg', () => {
    const out = css({ theme: 'dark' })
    expect(out).toContain('#1b1714')
    expect(out).toContain('#e7e1d4')
  })

  it('parchment theme → aged tan bg', () => {
    const out = css({ theme: 'parchment' })
    expect(out).toContain('#d9d0b0')
    expect(out).toContain('#3a3424')
  })

  it('newsreader typeface → stack includes Newsreader', () => {
    expect(css({ typeface: 'newsreader' })).toContain("'Newsreader'")
  })

  it('literata typeface → stack includes Literata', () => {
    expect(css({ typeface: 'literata' })).toContain("'Literata'")
  })

  it('sans typeface → system sans stack', () => {
    expect(css({ typeface: 'sans' })).toContain('ui-sans-serif')
  })

  it('compact spacing → line-height 1.4 with small para gap', () => {
    const out = css({ spacing: 'compact' })
    expect(out).toContain('1.4 !important')
    expect(out).toContain('0.4em')
  })

  it('cozy spacing → line-height 1.6', () => {
    expect(css({ spacing: 'cozy' })).toContain('1.6 !important')
  })

  it('relaxed spacing → line-height 1.9 + large para gap', () => {
    const out = css({ spacing: 'relaxed' })
    expect(out).toContain('1.9 !important')
    expect(out).toContain('1.25em')
  })

  it('textSizePt 17 → 142% of 12pt base (round(17/12*100))', () => {
    expect(css({ textSizePt: 17 })).toContain('142% !important')
  })

  it('textSizePt 24 → 200% of 12pt base', () => {
    expect(css({ textSizePt: 24 })).toContain('200% !important')
  })

  it('textSizePt 12 → 100% (exact base)', () => {
    expect(css({ textSizePt: 12 })).toContain('100% !important')
  })

  it('flowMode: paged → paginated', () => {
    expect(flowMode({ layout: 'paged' })).toBe('paginated')
  })

  it('flowMode: scroll → scrolled', () => {
    expect(flowMode({ layout: 'scroll' })).toBe('scrolled')
  })

  it('flowMode: no layout → paginated default', () => {
    expect(flowMode({})).toBe('paginated')
  })
})

// ─── (b) Persistence round-trip + prototype-pollution ───────────────────────────────────────────────

const STORAGE_KEY = 'edda.reading-preferences'

describe('Gate-2 — persistence round-trip + prototype-pollution', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })
  afterEach(() => {
    localStorage.clear()
  })

  it('set prefs → localStorage JSON matches the store state', () => {
    const store = useReaderPreferencesStore()
    store.setTheme('sepia')
    store.setTypeface('literata')
    store.setTextSizePt(22)
    store.setLayout('scroll')
    store.setSpacing('relaxed')

    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!) as Record<string, unknown>
    expect(parsed.theme).toBe('sepia')
    expect(parsed.typeface).toBe('literata')
    expect(parsed.textSizePt).toBe(22)
    expect(parsed.layout).toBe('scroll')
    expect(parsed.spacing).toBe('relaxed')
    // No extra unknown fields contaminate the persisted blob.
    const keys = Object.keys(parsed).sort()
    expect(keys).toEqual(['layout', 'spacing', 'textSizePt', 'theme', 'typeface'])
  })

  it('fresh store rehydrates persisted state exactly', () => {
    // Persist a custom set.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        theme: 'dark',
        typeface: 'sans',
        textSizePt: 30,
        layout: 'scroll',
        spacing: 'compact',
      }),
    )
    // Reset Pinia so the store re-initialises from localStorage.
    setActivePinia(createPinia())
    const store = useReaderPreferencesStore()
    expect(store.preferences).toEqual({
      theme: 'dark',
      typeface: 'sans',
      textSizePt: 30,
      layout: 'scroll',
      spacing: 'compact',
    })
  })

  it('empty localStorage → defaults (no throw)', () => {
    localStorage.setItem(STORAGE_KEY, '')
    setActivePinia(createPinia())
    const store = useReaderPreferencesStore()
    expect(store.theme).toBe('light')
    expect(store.textSizePt).toBe(17)
  })

  it('malformed JSON in localStorage → defaults (no throw)', () => {
    localStorage.setItem(STORAGE_KEY, '{bad json]')
    setActivePinia(createPinia())
    const store = useReaderPreferencesStore()
    expect(store.theme).toBe('light')
    expect(store.layout).toBe('paged')
  })

  it('prototype-pollution attempt: {"__proto__":{"polluted":true}} → no pollution, defaults', () => {
    // A JSON blob designed to pollute Object.prototype when naively spread/parsed.
    const pollutionPayload = '{"__proto__":{"polluted":true}}'
    localStorage.setItem(STORAGE_KEY, pollutionPayload)
    setActivePinia(createPinia())
    const store = useReaderPreferencesStore()

    // Store falls back to clean defaults.
    expect(store.theme).toBe('light')
    expect(store.typeface).toBe('newsreader')

    // Object.prototype must NOT be polluted.
    expect((Object.prototype as { polluted?: unknown }).polluted).toBeUndefined()
    // A fresh plain object must also be clean.
    const obj: { polluted?: unknown } = {}
    expect(obj.polluted).toBeUndefined()
  })

  it('prototype-pollution attempt: constructor key → no pollution, defaults', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ constructor: { polluted: true } }))
    setActivePinia(createPinia())
    const store = useReaderPreferencesStore()
    // Unknown key `constructor` is simply ignored — not promoted to any prototype.
    expect(store.theme).toBe('light')
    const fresh: { polluted?: unknown } = {}
    expect(fresh.polluted).toBeUndefined()
  })

  it('out-of-range textSizePt in localStorage → clamped to MAX, not raw value', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ textSizePt: 999 }))
    setActivePinia(createPinia())
    const store = useReaderPreferencesStore()
    expect(store.textSizePt).toBe(40) // MAX_TEXT_SIZE_PT
    expect(store.textSizePt).toBeLessThanOrEqual(40)
  })

  it('unknown theme string in localStorage → default light, no throw', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'neon-pink' }))
    setActivePinia(createPinia())
    const store = useReaderPreferencesStore()
    expect(store.theme).toBe('light')
  })
})

// ─── (c) ADR-001: the preferences crossing applyPreferences are non-reactive ─────────────────────────

describe('Gate-2 — ADR-001: applyPreferences receives a non-reactive plain clone', () => {
  it('a computed preferences snapshot from the store is non-reactive and structuredClone-safe', () => {
    setActivePinia(createPinia())
    const store = useReaderPreferencesStore()
    store.setTheme('dark')

    const snap = store.preferences
    // The value object itself must not be a Vue reactive proxy.
    expect(isReactive(snap)).toBe(false)
    // Must be structuredClone-able (no proxy/DOM contamination).
    const clone = structuredClone(snap)
    expect(clone).toEqual(snap)
    expect(clone).not.toBe(snap) // a copy, not the same reference
  })

  it('a reactive wrapper around ReadingPreferences, when cloned via structuredClone+toRaw, yields non-reactive', () => {
    // This simulates what ReaderView does before handing prefs to the navigator:
    // watch(store.preferences, prefs => applyPreferences(structuredClone(toRaw(prefs))))
    // The checker authors this independently of useNavigator.ts to assert the chain property.
    const live = reactive<ReadingPreferences>({ theme: 'sepia', textSizePt: 22 })
    expect(isReactive(live)).toBe(true) // confirm it's reactive before we strip it

    const snapshot = structuredClone(toRaw(live))
    expect(isReactive(snapshot)).toBe(false)
    expect(snapshot).toEqual({ theme: 'sepia', textSizePt: 22 })
    expect(snapshot).not.toBe(live)
  })

  it('preferences snapshot from store has only own primitive properties — no inherited keys', () => {
    setActivePinia(createPinia())
    const store = useReaderPreferencesStore()
    const snap = store.preferences

    // Verify the prototype chain: plain object, no Vue proxy methods lurking.
    expect(Object.getPrototypeOf(snap)).toBe(Object.prototype)
    // All values must be primitives (strings + numbers + booleans) — no functions, no objects.
    for (const [key, val] of Object.entries(snap)) {
      const t = typeof val
      expect(
        ['string', 'number', 'boolean', 'undefined'],
        `field ${key} must be primitive`,
      ).toContain(t)
    }
  })
})
