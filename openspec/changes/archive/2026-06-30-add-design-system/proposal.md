## Why

The tracker currently ships an unbranded zinc/white-and-black UI with a
persisted light/dark theme toggle (FR-SHELL-02). The Owner signed off the
«Поливайко» design system (scope change 2026-06-30, `docs/design.md` + the
`.dc.html` visual spec): an organic/soft/natural look — warm paper backgrounds
(never sterile white), rounded corners, botanical line icons, a forest-green
primary with earthy accents and a near-black graphite for text. That design is
a **single light "paper" theme**: there is no dark surface in the product the
app actually ships, so the light/dark machinery is removed and FR-SHELL-02 is
superseded by FR-SHELL-02a (a single paper theme, no toggle).

This slice delivers FR-DS-01..06 (tokens, restyled shared components, the plant
card, the botanical icon set, the «Поливайко» wordmark, and restyling every
existing screen) and FR-SHELL-02a (single paper theme, toggle removed). It is a
**restyle**: no domain behavior changes (plants/growth/watering/charts CRUD,
validation, ordering, persistence are untouched). Watering-status WIRING — what
fills the plant-card status pill and the home summary/reminders — is slice 7
(FR-REM-*); this slice ships the pill and card as a static placeholder pattern.

## What Changes

- Adopt the «Поливайко» design tokens as the single theme source in
  `app/globals.css` via Tailwind 4 CSS-first `@theme`: the full palette
  (forest/pine/sage/moss/mist, bark/clay/sand, paper/cloud/ink/stone/border,
  status + selection colors), the radii/spacing scale, and three font families
  (Quicksand display, Mulish body, Spline Sans Mono meta) wired via
  `next/font/google` and exposed as CSS variables + Tailwind font families
  (FR-DS-01).
- Remove the light/dark machinery (FR-SHELL-02a, superseding FR-SHELL-02):
  delete `components/theme/ThemeProvider.tsx` + `ThemeToggle.tsx`,
  `lib/theme/persistence.ts` (+ test) and `lib/theme/no-flash-script.ts`
  (+ test); drop the no-flash `<head>` script and the `ThemeProvider` wrapper
  from `app/layout.tsx`; drop the `@custom-variant dark` and every `dark:`
  usage. Keep `<html lang="uk">`.
- Add a reusable `Button` (variants primary/secondary/soft/ghost/danger/icon)
  and restyle the inputs / `FieldError` / `FormErrorBanner` to the design
  (radius 13, paper bg, focus → forest border + cloud bg; labels bark 13/600)
  (FR-DS-02).
- Add a botanical line-icon set as inline SVG components under
  `components/icons/` (water-drop brand glyph, leaf, sprout, sun, pot, bell;
  stroke 1.8, round caps/joins, no fill) (FR-DS-04).
- Add the plant card (radius 22, cloud bg, 1px border, striped placeholder +
  filename chip, top-right status-pill placeholder, Quicksand title + Mulish
  italic species + status line + full-width action button) for the list
  (FR-DS-03).
- Restyle the shell header with the «Поливайко» wordmark (FR-DS-05) and restyle
  the list/detail/growth/watering sections and the two charts onto the tokens —
  growth line forest, watering line clay (FR-DS-06).

## Capabilities

### Modified Capabilities
- `design-system`: the baseline already-implemented spec is restated here as
  the ADDED requirements this slice introduces (OpenSpec Option B — archiving
  this change restores the baseline content). FR-DS-01..06.
- `app-shell`: the theme requirement is MODIFIED from the persisted light/dark
  toggle (FR-SHELL-02) to a single light "paper" theme with no toggle
  (FR-SHELL-02a).

### New Capabilities
<!-- None. design-system already exists as baseline; app-shell is modified. -->

## Impact

- New code: `components/ui/Button.tsx`, `components/icons/*` (water-drop, leaf,
  sprout, sun, pot, bell), `components/plants/PlantCard.tsx`.
- Changed code: `app/globals.css` (token `@theme`), `app/layout.tsx` (fonts via
  `next/font/google`, ThemeProvider + no-flash script removed),
  `components/shell/Shell.tsx` (wordmark, toggle removed),
  `components/forms/{FieldError,FormErrorBanner}.tsx`,
  `components/plants/PlantForm.tsx`, `app/page.tsx`,
  `app/plants/[id]/page.tsx`, the growth/watering sections + rows,
  `components/charts/{GrowthChart,WateringChart}.tsx` (forest/clay strokes),
  `lib/i18n/uk.ts` (wordmark string; the now-unused `theme` toggle copy is
  removed).
- Removed code: `components/theme/ThemeProvider.tsx`, `ThemeToggle.tsx`,
  `lib/theme/persistence.ts` + `persistence.test.ts`,
  `lib/theme/no-flash-script.ts` + `no-flash-script.test.ts`.
- Trace ids touched: FR-DS-01..06, FR-SHELL-02a (supersedes FR-SHELL-02);
  NFR-A11Y-01, NFR-A11Y-02, NFR-A11Y-04, NFR-COMPAT-01, NFR-LOC-01.
- Behavior unchanged: plants/growth/watering/charts CRUD, validation, list
  ordering, persistence (this is a restyle only). Status-pill/reminder WIRING is
  slice 7 (FR-REM-*) — out of scope here; the pill ships as a placeholder.
- No database, no auth, no third-party integrations (TC-04). No real plant
  photos (FR-PLANT-09 / TC-06 is Future) — striped placeholders only.
- Rendered legibility/contrast at 360 px is verified downstream in Phase 6
  (vision-verify + axe on the paper theme), not asserted by unit tests here.
