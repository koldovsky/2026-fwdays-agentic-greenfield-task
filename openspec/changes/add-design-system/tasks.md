# Tasks — add-design-system (slice 6)

## 1. Red tests (limited but real) + deliberate test removals

- [x] 1.1 Token test: assert `app/globals.css` (the single theme source)
      declares the «Поливайко» color tokens with their exact hex —
      forest `#2F6B3F`, pine `#213D2A`, sage `#7E9B6E`, moss `#A7BE92`,
      mist `#DDE7CF`, bark `#5A4232`, clay `#A9744E`, sand `#E6D7BE`,
      paper `#F4F1E8`, cloud `#FBFAF5`, ink `#1B1E18`, stone `#6E7268`,
      border `#E2DDCF` — plus the status tokens (healthy/soon/overdue dot+chip,
      danger `#B5462E`) and the radii tokens (input 13, soft 14, card 22,
      pill 999). (FR-DS-01)
- [x] 1.2 Typography test: assert the theme declares the three font families
      Quicksand (display), Mulish (body), Spline Sans Mono (mono). (FR-DS-01)
- [x] 1.3 `Button` test: rendering each variant (primary, secondary, soft,
      ghost, danger, icon) yields a `button` role (or a link when `href` given)
      with the variant's expected classes/background token; an `aria-label`/
      children supplies the accessible name. (FR-DS-02)
- [x] 1.4 Icon tests: each of `WaterDropIcon`, `LeafIcon`, `SproutIcon`,
      `SunIcon`, `PotIcon`, `BellIcon` renders an `<svg>` with
      `stroke-width="1.8"`, round caps/joins, no fill; decorative by default
      (`aria-hidden`), and `role="img"` + `<title>` when a `title` prop is
      passed. (FR-DS-04)
- [x] 1.5 Brand wordmark test: the shell header renders the text «Поливайко».
      (FR-DS-05)
- [x] 1.6 No-theme-machinery test: the rendered shell contains NO theme-toggle
      control (no element with the old toggle accessible name) and no
      `ThemeProvider` is required to render the app. (FR-SHELL-02a)
- [x] 1.7 PlantCard test: renders radius-22 cloud card with a striped
      placeholder, a filename chip, a top-right status pill (placeholder), a
      Quicksand title + Mulish-italic species + status line + full-width action
      `Button`, wrapped in a link to `/plants/[id]`. (FR-DS-03)
- [x] 1.8 DELIBERATE REMOVAL — delete `lib/theme/persistence.test.ts` and
      `lib/theme/no-flash-script.test.ts`: they pin FR-SHELL-02 (light/dark
      persistence + no-flash) which is superseded by FR-SHELL-02a. The single
      paper theme has nothing to persist and no wrong theme to flash, so these
      assertions are no longer meaningful. Their regression value (no
      half-wired toggle creeps back) is preserved by task 1.6. Call this out in
      the PR description.

## 2. Implement to green

- [x] 2.1 `app/globals.css`: replace the light/dark token split with the single
      «Поливайко» `@theme` — all palette/status/radii tokens (D1), the
      Quicksand/Mulish/Spline Sans Mono font families (D2), a `::selection`
      rule (`#C7D9B0` / `#1B1E18`), `paper` body bg + `ink` text; remove
      `@custom-variant dark` and the `.dark {…}` block.
- [x] 2.2 `app/layout.tsx`: load Quicksand/Mulish/Spline Sans Mono via
      `next/font/google` as CSS-var handles; remove the Geist imports, the
      no-flash `<head>` script, the `suppressHydrationWarning`, and the
      `ThemeProvider` wrapper. Keep `<html lang="uk">`; apply the font-variable
      classes.
- [x] 2.3 Delete `components/theme/ThemeProvider.tsx`, `ThemeToggle.tsx`,
      `lib/theme/persistence.ts`, `lib/theme/no-flash-script.ts` (and their
      tests per 1.8). Remove the `theme` copy block from `lib/i18n/uk.ts`; add a
      `brand: "Поливайко"` string.
- [x] 2.4 `components/ui/Button.tsx`: the six-variant Button (D4) — real
      `<button>` by default, styled `<Link>` when `href` is given; hover tokens.
- [x] 2.5 `components/icons/`: the six inline-SVG icons (D5), stroke 1.8 / round
      caps / no fill / `currentColor`, `size` + optional `title` props.
- [x] 2.6 `components/forms/FieldError.tsx` + `FormErrorBanner.tsx`: recolor onto
      the danger/overdue token, restyle the banner (radius 13, soft tint, 1px
      border); keep `role="alert"` + the `aria-describedby` contract; drop
      `dark:` classes.
- [x] 2.7 `components/plants/PlantCard.tsx`: the design card (D6) with a
      placeholder `status` prop driving the pill + action variant.
- [x] 2.8 `components/shell/Shell.tsx`: «Поливайко» wordmark header on tokens;
      remove `<ThemeToggle/>`; drop `dark:` classes.
- [x] 2.9 Restyle `app/page.tsx` (H1, primary "add" Button, `PlantCard` list,
      empty state) and `components/plants/PlantForm.tsx` (inputs/labels/save
      Button per D4).
- [x] 2.10 Restyle `app/plants/[id]/page.tsx` (Quicksand H1, token `dl`, edit
      secondary Button, back ghost link, 1px `border` dividers) and the
      growth/watering sections + rows + forms — behavior unchanged.
- [x] 2.11 Charts: `GrowthChart` line stroke → forest `#2F6B3F`;
      `WateringChart` line stroke → clay `#A9744E`; move grid/axis classes off
      `zinc`/`dark:` onto `border`/`stone` tokens. Data/axes/empty/error/figure
      labels unchanged.
- [x] 2.12 Sweep: `grep -r "dark:" app components` returns nothing; no
      non-token hard-coded palette hex remains in restyled files (chart strokes
      are the named token values). All tests from section 1 green.

## 3. Phase-6 accessibility + vision (plain bullets, gated downstream)

- Run axe on the settled plant list/home and plant detail screens in the single
  paper theme — expect zero contrast violations (NFR-A11Y-01, NFR-A11Y-02).
- Vision-verify pass: the screens render legibly and match `docs/design.md`
  (warm paper bg, forest primary, rounded cards, botanical icons, «Поливайко»
  wordmark); confirm forest `#2F6B3F` text on paper `#F4F1E8` reads clearly.
- Responsive pass at 360 px: no horizontal overflow, no clipped controls;
  section padding scales down (NFR-COMPAT-01, R5).
- Keyboard pass: every restyled control (card link, buttons, inputs) is
  focusable with a visible focus ring and an accessible name (NFR-A11Y-04).

## 4. Final battery + manual-archive note

- [x] 4.1 Run lint (`npm run lint`) — clean.
- [x] 4.2 Run unit tests (`npm run test` / `vitest run`) — all green, including
      the new token/Button/icon/wordmark/no-theme/PlantCard tests; confirm the
      two deleted theme tests are gone and CI does not reference them.
- [x] 4.3 Run build (`npm run build`) — succeeds; `next/font` fonts resolve.
- [x] 4.4 `npx openspec validate add-design-system --strict` — passes.
- [x] 4.5 `npx openspec validate --all --strict` — passes.
- [ ] 4.6 Update `README.md` and `docs/current-state.md` (or equivalent): the
      app is «Поливайко», single light "paper" theme (no toggle); note
      FR-SHELL-02 superseded by FR-SHELL-02a.
- [ ] 4.7 Manual real-DB smoke test (real SQLite, `npm run dev`):
      1. Open `/` — header shows the «Поливайко» wordmark; page bg is warm
         paper, NOT white; there is NO theme toggle control.
      2. With ≥1 plant present, confirm each plant renders as a rounded
         (radius-22) cloud card with a striped placeholder, filename chip,
         a status pill, Quicksand title, italic species, and a full-width
         action button.
      3. With zero plants, confirm the empty state renders on the paper theme.
      4. Click a card → land on `/plants/[id]` (navigation behavior unchanged);
         confirm the detail header, `dl`, edit/back buttons, and section
         dividers are on the tokens.
      5. On detail, confirm the growth chart line is forest green and the
         watering chart line is clay/terracotta (not blue); both still plot
         existing data.
      6. Add a plant via the form: leave the name blank → submit → inline
         `FieldError` appears (danger color), no raw 500; fill it in → submit →
         the new plant persists and shows as a card on `/` after reload (real
         DB write survives reload).
      7. Reload `/` twice — the paper theme is stable; no flash; nothing reads
         or writes a persisted theme key.
- [ ] 4.8 Manual archive (OpenSpec CLI 1.5 — no auto-archive in this repo):
      GATED on 4.7 passing, run
      `npx openspec archive add-design-system --yes`; if that is unavailable,
      move the folder to
      `openspec/changes/archive/2026-06-30-add-design-system/` and fold the
      design-system ADDED requirements + the app-shell MODIFIED theme
      requirement into the baseline specs under `openspec/specs/`.
