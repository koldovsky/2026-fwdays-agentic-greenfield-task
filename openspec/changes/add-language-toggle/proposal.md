# Whole-app UA/EN language toggle

## Why

Vouch is Ukrainian-first (NFR-I18N-01, BC-BRAND-01), and the app views already
default to `locale="ua"` — but the brand fonts (Bricolage Grotesque + Hanken
Grotesk) ship no Cyrillic subset, so today Ukrainian renders in a broken
latin-only fallback, and the landing is pinned to English to hide the problem.
There is no way for a visitor to choose a language. This is the last piece of the
Ukrainian-first product.

The landing copy is already fully in `shared/lib/i18n` (ua+en) from
`extract-landing-i18n`; the only blockers left are the Cyrillic font and the
runtime locale mechanism.

## What Changes

- **Cyrillic fonts (user-approved).** Replace Bricolage Grotesque + Hanken
  Grotesk with **Unbounded** (display) + **Golos Text** (body), both loaded with
  `subsets: ["latin", "cyrillic"]`. This fixes Cyrillic rendering across the whole
  app, not only the landing.
- **Locale mechanism.** A `locale` cookie (Ukrainian-first default), read
  server-side to set `<html lang>` and passed into each page's view; a
  `LanguageSwitch` control in the top bar that sets the cookie and refreshes.
- **Flip the pinned locale.** The landing stops passing an explicit `"en"` and
  renders the resolved locale like the rest of the app.
- **Not in scope:** re-authoring the UA marketing copy (already flagged for native
  review), RTL, or per-route locale prefixes in the URL.

## Capabilities

### Modified Capabilities

- `design-system`: the display + body font tokens resolve to Cyrillic-capable
  faces (Unbounded + Golos Text) so Ukrainian renders on-brand.
- `app-shell`: the app resolves a visitor locale from a cookie (Ukrainian-first
  default), reflects it in `<html lang>`, and exposes a language switch; all
  localized views render the resolved locale.

## Impact

- `src/app/layout.tsx` (font swap + dynamic `<html lang>`), `src/app/globals.css`
  + `docs/vouch-design-system` + `DESIGN.md` (font tokens, sync rule).
- New locale cookie helper (`shared/config` or `shared/lib/i18n`) + a
  `LanguageSwitch` feature wired into the top bar.
- Pages resolve the cookie locale and pass it to their view; landing drops the
  pinned `"en"`.
- **Perf (NFR-PERF-04):** the new fonts add a display face + Cyrillic glyphs,
  growing font payload against the ~20 ms LCP margin. Unmeasurable in sandbox
  (no Chrome); MUST run `perf-audit` before production and trim weights/subsets if
  the budget regresses.

## Open question (flagged)

The Ukrainian marketing copy authored in `extract-landing-i18n` becomes visible
once the default locale renders it. It is faithful but SHOULD get a native
marketing-voice review.
