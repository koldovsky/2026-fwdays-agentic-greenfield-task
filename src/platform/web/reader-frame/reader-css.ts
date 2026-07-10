// Reading-preferences -> book CSS mapping. Runs INSIDE the reader frame (ADR-013): the foliate engine
// lives on the separate reader origin, so the CSS it injects into each spine document is built here, where
// the renderer is. This module is the book-typography mapping the load-bearing invariant calls "readium-css
// inside the navigator": `ReadingPreferences` (the platform-neutral vocabulary) -> the concrete CSS the
// foliate renderer applies via `setStyles`, plus the foliate flow mode. App chrome (Tailwind) is never
// touched here; only the book content document is.
//
// SECURITY (ch8, the gate-critical item): this function is the TRUST BOUNDARY for preference data that
// arrives over the app<->frame postMessage bridge — at runtime it is untrusted structured data, NOT a
// type-checked value. So every value is validated/clamped/allowlisted BEFORE it is interpolated into CSS:
//
//  - Fonts: `typeface` is a closed union mapped through {@link TYPEFACE_STACKS}; a legacy `fontFamily`
//    string (not on the current type but reachable as raw bridge data) is honoured ONLY when it exactly
//    matches a known family (own-property allowlist) and is otherwise DROPPED. A font value can therefore
//    never be an arbitrary string interpolated into CSS (`expression(...)`, `'; <rule>`, url(...) , etc.).
//  - Sizes/spacing: numbers are coerced + clamped to safe ranges, so a string injection becomes NaN -> a
//    safe default and a number is bounded. Theme colours and spacing gaps come from constant tables keyed
//    by the closed unions — never from caller input.

import type { ReadingPreferences } from '@/core/model'
import { READING_THEME_COLORS } from '@/core/model/reading-theme-colors'

/**
 * The ONLY font stacks a book can be styled with — closed-union keyed, all values author-controlled
 * constants (self-hosted Newsreader/Literata from design-system + a system Sans). Nothing here is ever
 * derived from caller input, so it cannot carry an injection.
 */
const TYPEFACE_STACKS: Record<NonNullable<ReadingPreferences['typeface']>, string> = {
  newsreader: "'Newsreader', ui-serif, Georgia, 'Times New Roman', serif",
  literata: "'Literata', ui-serif, Georgia, 'Times New Roman', serif",
  sans: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
}

/**
 * Defense-in-depth allowlist for a legacy `fontFamily` string arriving as raw bridge data (the current
 * `ReadingPreferences` carries `typeface`, not `fontFamily`, but the runtime payload is untrusted). EXACT
 * matches only, mapped to the same safe stacks; anything else resolves to `undefined` and is never emitted.
 */
const ALLOWED_LEGACY_FAMILIES: Record<string, string> = {
  Newsreader: TYPEFACE_STACKS.newsreader,
  Literata: TYPEFACE_STACKS.literata,
  Sans: TYPEFACE_STACKS.sans,
}

/** Spacing-density presets — line-height + inter-paragraph gap. Constant, closed-union keyed. */
const SPACING_PRESETS: Record<
  NonNullable<ReadingPreferences['spacing']>,
  { lineHeight: number; paraGap: string }
> = {
  compact: { lineHeight: 1.4, paraGap: '0.4em' },
  cozy: { lineHeight: 1.6, paraGap: '0.8em' },
  relaxed: { lineHeight: 1.9, paraGap: '1.25em' },
}

// Text size is modelled in points and mapped to a percentage of a pinned base (12pt = 100%). Pin the base,
// not the structure: if the rendered size reads off against the maket's `17pt`, adjust PT_BASE only.
const PT_BASE = 12
const MIN_PT = 10
const MAX_PT = 40
const DEFAULT_PT = 17
const MIN_LINE_HEIGHT = 1.0
const MAX_LINE_HEIGHT = 3.0

/** Coerce + clamp a point size to the safe [MIN_PT, MAX_PT] range; non-finite input -> the default. */
function clampPt(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return DEFAULT_PT
  return Math.min(MAX_PT, Math.max(MIN_PT, n))
}

/** Coerce + clamp a line-height to [MIN_LINE_HEIGHT, MAX_LINE_HEIGHT]; non-finite input -> undefined. */
function clampLineHeight(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return undefined
  return Math.min(MAX_LINE_HEIGHT, Math.max(MIN_LINE_HEIGHT, n))
}

/** Resolve the font stack to apply, or `undefined` — typeface union first, then the legacy allowlist. */
function resolveFontStack(preferences: ReadingPreferences): string | undefined {
  if (preferences.typeface && Object.hasOwn(TYPEFACE_STACKS, preferences.typeface)) {
    return TYPEFACE_STACKS[preferences.typeface]
  }
  // Untrusted bridge data may still carry a legacy `fontFamily`; honour ONLY an exact known family.
  const legacy = (preferences as { fontFamily?: unknown }).fontFamily
  if (typeof legacy === 'string' && Object.hasOwn(ALLOWED_LEGACY_FAMILIES, legacy)) {
    return ALLOWED_LEGACY_FAMILIES[legacy]
  }
  return undefined
}

/** Resolve the spacing preset — the closed-union preset first, then a clamped legacy `lineHeight`. */
function resolveSpacing(
  preferences: ReadingPreferences,
): { lineHeight: number; paraGap: string } | undefined {
  if (preferences.spacing && Object.hasOwn(SPACING_PRESETS, preferences.spacing)) {
    return SPACING_PRESETS[preferences.spacing]
  }
  const legacy = clampLineHeight((preferences as { lineHeight?: unknown }).lineHeight)
  if (legacy !== undefined) return { lineHeight: legacy, paraGap: SPACING_PRESETS.cozy.paraGap }
  return undefined
}

/**
 * The foliate flow mode for a preference set: `layout` (closed union) first, then a legacy `scroll`
 * boolean from raw bridge data, defaulting to paginated. Exported so the harness sets the SAME flow on
 * open and on every live `applyPreferences`.
 */
export function flowMode(preferences: ReadingPreferences): 'scrolled' | 'paginated' {
  if (preferences.layout === 'scroll') return 'scrolled'
  if (preferences.layout === 'paged') return 'paginated'
  return (preferences as { scroll?: unknown }).scroll === true ? 'scrolled' : 'paginated'
}

/**
 * Build the book-content stylesheet from a (validated) preference set, for the foliate renderer to inject
 * into each spine document. Returns `''` when nothing is set. Every emitted value is from a constant table
 * or a coerced/clamped number — no caller string is ever interpolated. `!important` on the theme colours so
 * the reader's chosen theme wins the publisher's own cascade.
 */
export function buildReadingCss(preferences: ReadingPreferences): string {
  const rules: string[] = []

  const theme = preferences.theme ? READING_THEME_COLORS[preferences.theme] : undefined
  if (theme) {
    rules.push(`html, body { background: ${theme.bg} !important; color: ${theme.fg} !important; }`)
  }

  const bodyDecls: string[] = []
  const fontStack = resolveFontStack(preferences)
  if (fontStack) bodyDecls.push(`font-family: ${fontStack} !important`)

  if (preferences.textSizePt !== undefined) {
    // pt -> percentage of the pinned base (12pt = 100%). font-size on body ONLY (never compounded on html).
    const pct = Math.round((clampPt(preferences.textSizePt) / PT_BASE) * 100)
    bodyDecls.push(`font-size: ${pct}% !important`)
  }

  const spacing = resolveSpacing(preferences)
  if (spacing) bodyDecls.push(`line-height: ${spacing.lineHeight} !important`)

  if (bodyDecls.length) rules.push(`body { ${bodyDecls.join('; ')}; }`)
  if (spacing) rules.push(`p { margin-block: ${spacing.paraGap} !important; }`)

  return rules.join('\n')
}
