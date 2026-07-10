import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { isReactive } from 'vue'
import {
  useReaderPreferencesStore,
  MIN_TEXT_SIZE_PT,
  MAX_TEXT_SIZE_PT,
} from '@/app/stores/readerPreferencesStore'

const STORAGE_KEY = 'edda.reading-preferences'

function readPersisted(): Record<string, unknown> | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})
afterEach(() => {
  localStorage.clear()
})

describe('readerPreferencesStore — panel trigger (unchanged seam)', () => {
  it('keeps the isOpen / requestOpen / close / toggle API', () => {
    const store = useReaderPreferencesStore()
    expect(store.isOpen).toBe(false)
    store.requestOpen()
    expect(store.isOpen).toBe(true)
    store.close()
    expect(store.isOpen).toBe(false)
    store.toggle()
    expect(store.isOpen).toBe(true)
    store.toggle()
    expect(store.isOpen).toBe(false)
  })
})

describe('readerPreferencesStore — defaults (match the maket panel)', () => {
  it('defaults to Light / Newsreader / 17pt / Paged / cozy with no persisted state', () => {
    const store = useReaderPreferencesStore()
    expect(store.theme).toBe('light')
    expect(store.typeface).toBe('newsreader')
    expect(store.textSizePt).toBe(17)
    expect(store.layout).toBe('paged')
    expect(store.spacing).toBe('cozy')
  })

  it('exposes preferences as a PLAIN, non-reactive snapshot of the full set', () => {
    const store = useReaderPreferencesStore()
    const prefs = store.preferences
    expect(isReactive(prefs)).toBe(false)
    expect(Object.getPrototypeOf(prefs)).toBe(Object.prototype)
    expect(prefs).toEqual({
      theme: 'light',
      typeface: 'newsreader',
      textSizePt: 17,
      layout: 'paged',
      spacing: 'cozy',
    })
    // structuredClone-safe (no proxy / DOM) — it must cross the reader bridge.
    expect(structuredClone(prefs)).toEqual(prefs)
  })
})

describe('readerPreferencesStore — setters mutate and persist', () => {
  it('each setter updates the value and writes the full set to localStorage', () => {
    const store = useReaderPreferencesStore()
    store.setTheme('dark')
    store.setTypeface('literata')
    store.setLayout('scroll')
    store.setSpacing('relaxed')
    store.setTextSizePt(24)

    expect(store.preferences).toEqual({
      theme: 'dark',
      typeface: 'literata',
      textSizePt: 24,
      layout: 'scroll',
      spacing: 'relaxed',
    })
    expect(readPersisted()).toEqual(store.preferences)
  })

  it('clamps textSizePt to the slider range and rounds', () => {
    const store = useReaderPreferencesStore()
    store.setTextSizePt(1000)
    expect(store.textSizePt).toBe(MAX_TEXT_SIZE_PT)
    store.setTextSizePt(1)
    expect(store.textSizePt).toBe(MIN_TEXT_SIZE_PT)
    store.setTextSizePt(20.6)
    expect(store.textSizePt).toBe(21)
  })

  it('ignores out-of-vocabulary setter input (no throw, value unchanged)', () => {
    const store = useReaderPreferencesStore()
    store.setTheme('neon' as never)
    store.setTypeface('comic' as never)
    store.setLayout('flip' as never)
    store.setSpacing('airy' as never)
    store.setTextSizePt(Number.NaN)
    expect(store.preferences).toEqual({
      theme: 'light',
      typeface: 'newsreader',
      textSizePt: 17,
      layout: 'paged',
      spacing: 'cozy',
    })
  })
})

describe('readerPreferencesStore — synchronous rehydration', () => {
  it('rehydrates a previously persisted set on store creation', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        theme: 'sepia',
        typeface: 'literata',
        textSizePt: 22,
        layout: 'scroll',
        spacing: 'compact',
      }),
    )
    const store = useReaderPreferencesStore()
    expect(store.preferences).toEqual({
      theme: 'sepia',
      typeface: 'literata',
      textSizePt: 22,
      layout: 'scroll',
      spacing: 'compact',
    })
  })

  it('falls back to defaults for unknown/invalid persisted values (never throws)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        theme: 'neon', // invalid -> default light
        typeface: 'literata', // valid -> kept
        textSizePt: 999, // out of range -> clamped to MAX
        layout: 42, // wrong type -> default paged
        unknownKey: 'ignored',
      }),
    )
    const store = useReaderPreferencesStore()
    expect(store.preferences).toEqual({
      theme: 'light',
      typeface: 'literata',
      textSizePt: MAX_TEXT_SIZE_PT,
      layout: 'paged',
      spacing: 'cozy',
    })
  })

  it('falls back to defaults for a corrupt (non-JSON) blob', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json')
    const store = useReaderPreferencesStore()
    expect(store.theme).toBe('light')
    expect(store.textSizePt).toBe(17)
  })
})
