// The ONE source of truth for the four reading themes' book colours (bg/fg), platform-neutral (plain hex
// strings; no DOM/CSS types — consistent with the load-bearing invariant that `core/model` carries no
// web-only assumptions). Two web-side consumers import this table instead of declaring their own copy:
//
//  - `src/platform/web/reader-frame/reader-css.ts` — what the reader ACTUALLY renders (runs inside the
//    origin-isolated reader frame, ADR-013).
//  - `src/app/components/reader/DisplayPanel.vue` — the chrome swatches the user picks from (runs in the
//    main app origin).
//
// Both are plain TypeScript imports resolved at build time, each bundled into its own origin's output —
// so this crosses no runtime boundary and needs no postMessage plumbing (per CLAUDE.md: prefer a plain
// shared module of constants over runtime messaging for anything shared across the app/frame origins).
// Before this file existed the same four colours were hand-copied in both places; DESIGN.md called that
// out as a lie waiting to happen ("a swatch that disagrees with the CSS it previews"), and it is exactly
// why the sepia AAA fix below needed a two-file patch instead of one.
import type { ReadingPreferences } from './index'

export type ReadingThemeName = NonNullable<ReadingPreferences['theme']>

export interface ReadingThemeColors {
  bg: string
  fg: string
}

/**
 * Body-text contrast (verified against WCAG relative-luminance math, not asserted from memory — see
 * DESIGN.md § Reading Themes / PRODUCT.md § Accessibility for the committed AAA (7:1) bar):
 *
 *   light      #faf8f3 / #2b2a26  → 13.53:1  (AAA)
 *   sepia      #f1e7d0 / #584734  →  7.22:1  (AAA — was #5b4a36 at 6.89:1, an AAA miss)
 *   dark       #1b1714 / #e7e1d4  → 13.67:1  (AAA)
 *   parchment  #d9d0b0 / #3a3424  →  8.02:1  (AAA)
 */
export const READING_THEME_COLORS: Record<ReadingThemeName, ReadingThemeColors> = {
  light: { bg: '#faf8f3', fg: '#2b2a26' }, // near-white, warm (not pure #fff)
  sepia: { bg: '#f1e7d0', fg: '#584734' }, // warm cream — fg bumped from #5b4a36 to clear AAA (7:1)
  dark: { bg: '#1b1714', fg: '#e7e1d4' }, // near-black, warm light text
  parchment: { bg: '#d9d0b0', fg: '#3a3424' }, // aged tan/olive
}
