import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ReadingPreferences } from '@/core/model'

/**
 * The reading-preferences store: the reader's "Aa" panel state (`isOpen`) PLUS the single global,
 * persisted `ReadingPreferences` set the Display panel drives (add-reading-preferences, change 8). The
 * panel's open/close trigger was seeded by add-reader-navigation (the reader reflects {@link isOpen} on
 * the Aa button); this change fills in the actual preference values, their setters, and persistence.
 *
 * Preferences are ONE global set shared by every book (design: not per-book) and persisted SYNCHRONOUSLY
 * to `localStorage`, rehydrated when the store is first created — before the navigator opens a book — so a
 * reopened book paints already themed (no flash of default styling). Each setter validates/clamps its
 * input against the closed vocabulary and persists, so a malformed value can never reach the store. The
 * web mapping to readium-css/foliate styles is `reader-css.ts` in the reader frame, NOT here — this store
 * only owns the platform-neutral values and hands a PLAIN snapshot to the navigator via `preferences`.
 */

const STORAGE_KEY = 'edda.reading-preferences'

/** Text size is points; clamp matches the panel slider's range AND the reader-frame CSS clamp. */
export const MIN_TEXT_SIZE_PT = 10
export const MAX_TEXT_SIZE_PT = 40

const THEMES = ['light', 'sepia', 'dark', 'parchment'] as const
const TYPEFACES = ['newsreader', 'literata', 'sans'] as const
const LAYOUTS = ['paged', 'scroll'] as const
const SPACINGS = ['compact', 'cozy', 'relaxed'] as const

export type ReadingTheme = (typeof THEMES)[number]
export type ReadingTypeface = (typeof TYPEFACES)[number]
export type ReadingLayout = (typeof LAYOUTS)[number]
export type ReadingSpacing = (typeof SPACINGS)[number]

/** The full, always-resolved preference set the store holds (never `undefined` — the panel needs a value). */
interface ResolvedPreferences {
  theme: ReadingTheme
  typeface: ReadingTypeface
  textSizePt: number
  layout: ReadingLayout
  spacing: ReadingSpacing
}

/** Defaults match the maket panel's selected state (doc/mobile/04 — Light/Newsreader/17pt/Paged/cozy). */
const DEFAULTS: ResolvedPreferences = {
  theme: 'light',
  typeface: 'newsreader',
  textSizePt: 17,
  layout: 'paged',
  spacing: 'cozy',
}

function oneOf<T extends string>(allowed: readonly T[], value: unknown): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined
}

function clampTextSizePt(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return undefined
  return Math.min(MAX_TEXT_SIZE_PT, Math.max(MIN_TEXT_SIZE_PT, Math.round(n)))
}

/**
 * Read persisted preferences SYNCHRONOUSLY, defensively: any unknown key is ignored and any invalid value
 * falls back to its default — a corrupt/old/hand-edited `localStorage` blob never throws and never yields
 * an out-of-vocabulary value. Returns the full default set when nothing is stored or parsing fails.
 */
function loadPersisted(): ResolvedPreferences {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (!raw) return { ...DEFAULTS }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULTS }
    const data = parsed as Record<string, unknown>
    return {
      theme: oneOf(THEMES, data.theme) ?? DEFAULTS.theme,
      typeface: oneOf(TYPEFACES, data.typeface) ?? DEFAULTS.typeface,
      textSizePt: clampTextSizePt(data.textSizePt) ?? DEFAULTS.textSizePt,
      layout: oneOf(LAYOUTS, data.layout) ?? DEFAULTS.layout,
      spacing: oneOf(SPACINGS, data.spacing) ?? DEFAULTS.spacing,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export const useReaderPreferencesStore = defineStore('reader-preferences', () => {
  // --- Panel open/close (the add-reader-navigation seam) -------------------------------------------
  const isOpen = ref(false)

  function requestOpen(): void {
    isOpen.value = true
  }
  function close(): void {
    isOpen.value = false
  }
  function toggle(): void {
    isOpen.value = !isOpen.value
  }

  // --- The global, persisted preference values -----------------------------------------------------
  const initial = loadPersisted()
  const theme = ref<ReadingTheme>(initial.theme)
  const typeface = ref<ReadingTypeface>(initial.typeface)
  const textSizePt = ref<number>(initial.textSizePt)
  const layout = ref<ReadingLayout>(initial.layout)
  const spacing = ref<ReadingSpacing>(initial.spacing)

  /** A PLAIN snapshot (fresh object literal of primitives) the navigator/bridge consumes — never a proxy. */
  const preferences = computed<ReadingPreferences>(() => ({
    theme: theme.value,
    typeface: typeface.value,
    textSizePt: textSizePt.value,
    layout: layout.value,
    spacing: spacing.value,
  }))

  function persist(): void {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences.value))
    } catch {
      // Persistence is best-effort (quota / disabled storage) — never block a reading-preference change.
    }
  }

  // Setters validate/clamp then persist, so the store never holds an out-of-vocabulary value.
  function setTheme(value: ReadingTheme): void {
    const next = oneOf(THEMES, value)
    if (!next) return
    theme.value = next
    persist()
  }
  function setTypeface(value: ReadingTypeface): void {
    const next = oneOf(TYPEFACES, value)
    if (!next) return
    typeface.value = next
    persist()
  }
  function setTextSizePt(value: number): void {
    const next = clampTextSizePt(value)
    if (next === undefined) return
    textSizePt.value = next
    persist()
  }
  function setLayout(value: ReadingLayout): void {
    const next = oneOf(LAYOUTS, value)
    if (!next) return
    layout.value = next
    persist()
  }
  function setSpacing(value: ReadingSpacing): void {
    const next = oneOf(SPACINGS, value)
    if (!next) return
    spacing.value = next
    persist()
  }

  return {
    // panel trigger (unchanged seam)
    isOpen,
    requestOpen,
    close,
    toggle,
    // preference state
    theme,
    typeface,
    textSizePt,
    layout,
    spacing,
    preferences,
    // setters
    setTheme,
    setTypeface,
    setTextSizePt,
    setLayout,
    setSpacing,
  }
})
