# Design — add-design-system (slice 6)

## Goals

- Adopt the «Поливайко» design tokens (`docs/design.md`) as the single theme
  source and restyle every existing screen + shared component onto them, with
  zero change to domain behavior (FR-DS-01..06).
- Collapse the app to a single light "paper" theme and delete the light/dark
  machinery (FR-SHELL-02a, superseding FR-SHELL-02).

## Non-goals

- Watering-status / reminder WIRING (what data drives the plant-card status
  pill, the home summary count, and reminder rows) — that is slice 7
  (FR-REM-*). Here the status pill + card action ship as a **static
  placeholder pattern**, not bound to derived status.
- Real plant photos (FR-PLANT-09 / TC-06, Future) — striped placeholders only.
- Prototype-only chrome with no app counterpart: dark surfaces, the phone
  mockup + its shadow, the bottom tab bar / center FAB, the summary
  "decorative circle", slider, switch on a real screen. FR-DS-02 scopes the
  restyle to the components the app actually uses (buttons, inputs,
  field/form errors; the segmented control / switch / checkbox / progress
  meter are required only if/when a screen uses them — today none do, so they
  are not built).
- Rendered legibility, AA contrast measurement, and the 360 px responsive
  pass — those are objectively verified downstream by Phase 6 (vision-verify +
  axe on the paper theme), referenced in the spec contrast scenarios.

## Key decisions

### D1 — Tokens via Tailwind 4 CSS-first `@theme` in `globals.css`

The stack is Tailwind 4 (CSS-first, no `tailwind.config.*`), so tokens live in
`app/globals.css` inside `@theme`. Mapping every `docs/design.md` color to a
Tailwind color token (`--color-<name>` → utility `bg-<name>`, `text-<name>`,
`border-<name>`):

- Greens: `forest #2F6B3F`, `pine #213D2A`, `sage #7E9B6E`, `moss #A7BE92`,
  `mist #DDE7CF`.
- Earth: `bark #5A4232`, `clay #A9744E`, `sand #E6D7BE`.
- Neutrals: `paper #F4F1E8` (app bg), `cloud #FBFAF5` (card surface),
  `ink #1B1E18` (primary text), `stone #6E7268` (muted text),
  `border #E2DDCF` (hairlines).
- Status: healthy dot `#2F6B3F` / chip `#DDE7CF` / text `#213D2A`; soon dot
  `#A9744E` / chip `#F6E7D6` / text `#5A4232`; overdue dot `#B5462E` / chip
  `#F3DAD0` / text `#7A2E1C`; danger `#B5462E` (hover `#9D3B25`).
- Selection: `--selection-bg #C7D9B0`, `--selection-text #1B1E18` (wired via a
  `::selection` rule).
- Extra greys named in design.md that are not first-class palette entries
  (`#9A9588` placeholder/idle-segment, `#B6B1A4` tab-inactive, `#D8D2C2`
  switch-off, `#E6E1D3` meter track) are exposed as CSS variables so any
  component that needs them references a token, never a literal (FR-DS-01
  "no component hard-codes an alternate palette").

`paper` becomes the `<body>` background and `ink` the default text color
(replacing the old `--background #ffffff` / `--foreground #18181b`). The single
theme means **no `:root` vs `.dark` split** — one set of values, no
`@custom-variant dark`.

**Trade-off (token naming):** named brand tokens (`bg-forest`) rather than
semantic aliases (`bg-primary`). Brand names match `docs/design.md` 1:1 (the
source of truth and the eval rubric), keeping the spec auditable; the cost is
less indirection if the palette is ever re-skinned. Acceptable — this is the
canonical palette, not a swappable theme. Not ADR-worthy.

**Radii / spacing.** Tokens: `--radius-input 13px`, `--radius-soft 14px`,
`--radius-card 22px` (the 18–22 range; the plant card is 22), `--radius-pill
999px`. Section rhythm (≈72px top / 24px bottom, 1px `border` divider, content
max-width 1080px, horizontal padding 56px responsive down to mobile) applied via
utilities on the shell/sections; no harsh shadows (only the prototype phone used
one, and that is a non-goal).

### D2 — Fonts via `next/font/google`, exposed as CSS vars + Tailwind families

Load Quicksand (display/headings), Mulish (body/inputs, incl. italic 400 for
latin names), Spline Sans Mono (meta/numbers) with `next/font/google` in
`app/layout.tsx`, each with a CSS-variable handle (`--font-display`,
`--font-body`, `--font-mono`). `@theme` maps them to Tailwind font families
(`--font-display`, `--font-body`, `--font-mono` → `font-display`, `font-body`,
`font-mono`). `<body>` defaults to `font-body` (Mulish). The old Geist/Geist_Mono
imports and their `--font-geist-*` vars are removed.

**Trade-off:** `next/font/google` self-hosts the fonts (no layout-shift, no
external request, no extra `<link>`), at the cost of a build-time fetch — the
established Next pattern and what the repo already uses, so no new risk.

### D3 — Remove the light/dark machinery (FR-SHELL-02a)

Deliberate deletions (FR-SHELL-02 is superseded — these files implement a
requirement that no longer exists):

- delete `components/theme/ThemeProvider.tsx` and `components/theme/ThemeToggle.tsx`;
- delete `lib/theme/persistence.ts` + `lib/theme/persistence.test.ts`;
- delete `lib/theme/no-flash-script.ts` + `lib/theme/no-flash-script.test.ts`;
- `app/layout.tsx`: remove the `<head>` no-flash `<script>`, the
  `suppressHydrationWarning` on `<html>` (no longer needed — nothing mutates the
  class pre-hydration), and the `<ThemeProvider>` wrapper around `<Shell>`. Keep
  `<html lang="uk">`.
- `components/shell/Shell.tsx`: remove the `<ThemeToggle/>`.
- `lib/i18n/uk.ts`: remove the now-unused `theme` toggle copy block; add the
  `brand` wordmark string «Поливайко».
- `globals.css`: remove `@custom-variant dark` and the `.dark { … }` block.
- Every `dark:` Tailwind variant across the restyled files is dropped (a single
  theme has no dark variant). After the restyle, `grep -r "dark:" app components`
  must return nothing.

**Why no persisted preference at all:** the single theme has nothing to persist,
so the localStorage key, the pre-hydration script, and the
`useSyncExternalStore` reflection are all dead weight. Removing them also removes
the only `suppressHydrationWarning` in the tree — the server and client now
render the same `<html>` class, which is strictly more correct.

**Trade-off / risk (R1):** deleting `no-flash-script.ts` + test drops the
regression guard that pinned "theme applied before first paint". That guard
becomes meaningless under one theme (there is no wrong theme to flash). Replace
it with a lightweight assertion that the app NO LONGER carries theme machinery
(no toggle, no ThemeProvider) so a future re-introduction of a half-wired toggle
fails CI. Net coverage stays honest.

### D4 — Reusable `Button` + restyled inputs / errors (FR-DS-02)

New `components/ui/Button.tsx` — a single component with a `variant` prop:

| variant | bg | text | border | radius | hover |
|---|---|---|---|---|---|
| primary | forest | paper | — | 14 (soft) | `#275834` |
| secondary | transparent | forest | 1.5px forest | 14 | bg mist |
| soft | mist | pine | — | 14 | `#CBDCB8` |
| ghost | transparent | stone | — | 14 | bg `#EEE9DC` |
| danger-ghost | transparent | danger `#B5462E` | — | 14 | bg overdue-chip `#F3DAD0` |
| danger | `#B5462E` | paper | — | 14 | `#9D3B25` |
| icon | clay (filled) / cloud (outline) | paper / — | outline: 1.5px border | 14, 48×48 | outline: border forest |

Quicksand 600. Renders a real `<button>` (keyboard-operable, accessible name
from children/`aria-label`) unless `as="a"`/`href` is given, in which case a
`<Link>` styled identically (the list "add plant" / detail "edit" / "back" are
links today, so the styling must apply to both). `forest` hover `#275834` and
the other hover values are exposed as tokens.

Inputs (`PlantForm`, growth/watering forms): bg `paper`, 1.5px `border`, radius
13, padding `12px 15px`, Mulish 15px; focus → border `forest` + bg `cloud`.
Labels: 13px / 600 `bark`. Hints: `stone`. The search input (with leading
magnifier) is part of FR-DS-02 but the app has no search screen (FR-PLANT-10 is
Future), so it is NOT built (only-used-components clause); the spec records it as
specified-but-not-built rather than asserting it.

`FieldError`: keep `role="alert"`, recolor the message to the overdue/danger
red token `#B5462E` (dropping `text-red-600 dark:text-red-400`).
`FormErrorBanner`: keep `role="alert"`, restyle onto the danger token family on
a soft tinted surface, radius 13, 1px border; drop the `dark:` classes.

The `danger-ghost` variant is a ghost-shaped DESTRUCTIVE trigger (the collapsed
delete affordance): transparent bg, danger-red text, overdue-chip hover. Its
danger color is BAKED INTO the variant string, not appended via `className` over
`ghost`. With no `tailwind-merge` in this project, an appended `text-danger` over
the ghost variant's `text-stone` would lose to whichever single-property `color`
utility appears later in the generated stylesheet (Tailwind v4 resolves equal-
specificity conflicts by CSS source order, not class-attribute order), muting the
destructive affordance to stone. A dedicated variant guarantees danger-red
regardless of CSS source order. The delete-with-confirm buttons
(`DeletePlantButton`, `DeleteMeasurementButton`, `DeleteWateringButton`) use it.

**Trade-off (one Button vs per-variant components):** a single variant-prop
component keeps the variants in one place and matches the test ("renders each
variant with expected role/classes"), at the cost of a `variant` union to
maintain. Simpler than separate files. Not ADR-worthy.

### D5 — Botanical line-icon set (FR-DS-04)

Inline SVG React components under `components/icons/`: `WaterDropIcon`,
`LeafIcon`, `SproutIcon`, `SunIcon`, `PotIcon`, `BellIcon`. Each: `fill="none"`,
`stroke="currentColor"`, `strokeWidth={1.8}`, `strokeLinecap="round"`,
`strokeLinejoin="round"`, a `size` prop (default 24, used for 15–26px inline /
34px swatch). Default `aria-hidden="true"` (decorative); when a `title` prop is
given, render `role="img"` + a `<title>` (accessible name) for standalone uses.
The water-drop is the brand glyph AND the water action — the SAME component is
reused in both, kept visually consistent (FR-DS-04). Single-color via
`currentColor`, so the consumer sets `text-forest` / `text-bark`.

**Trade-off (inline SVG vs an icon library):** `docs/design.md` allows either,
but the strokes are bespoke (1.8, round caps, a specific water-drop brand glyph)
and the set is tiny (6). Inline components give exact control over the brand
glyph and add zero dependency. Chosen over lucide/heroicons. Not ADR-worthy.

### D6 — Plant card (FR-DS-03)

New `components/plants/PlantCard.tsx` used by the list (`app/page.tsx`):

- Frame: radius 22 (`--radius-card`), bg `cloud`, 1px `border`,
  `overflow:hidden`.
- Image area ~150px tall: striped placeholder via
  `repeating-linear-gradient(45deg,#DDE7CF,#DDE7CF 12px,#D2DEC0 12px,#D2DEC0
  24px)` (green tints; sand variant available); bottom-left monospace
  (Spline Sans Mono) filename chip on a translucent `cloud` bg, radius 7;
  top-right **status pill** (dot + label, radius 999) — **placeholder** colors
  (healthy by default) since status wiring is slice 7.
- Body padding 18px: title Quicksand 700 20px; species/latin name Mulish italic
  13px `#9A9588`; status line (15px water-drop icon + 13px text — `stone`
  normally, `#B5462E`/600 when overdue); full-width action `Button` (soft for
  healthy "Доглянути", primary for due, danger for overdue) — variant driven by
  the placeholder status until slice 7 binds it.
- The whole card links to `/plants/[id]` (keyboard-operable, focus-visible
  ring), preserving today's list→detail navigation behavior.

**Trade-off (placeholder status now vs waiting for slice 7):** the card carries
a `status` prop with a sensible default so the visual pattern (pill + action
variant) ships and is testable now, and slice 7 only has to supply the derived
value. The alternative (no pill until slice 7) would split FR-DS-03 across two
slices. Shipping the pattern with a placeholder keeps FR-DS-03 whole here. The
spec is explicit that the WIRING is slice 7 so this is not mis-scoped.

### D7 — Restyle the screens (FR-DS-06)

- Shell header: «Поливайко» wordmark (`uk.brand`, Quicksand 700) replacing the
  old app-title text + toggle; `paper` page bg, `cloud` header surface, 1px
  `border` bottom, `ink` text.
- List (`app/page.tsx`): H1 Quicksand, "add plant" as a primary `Button`, cards
  via `PlantCard`, empty state on `cloud` with `border` dashed → restyled to
  tokens.
- Detail (`app/plants/[id]/page.tsx`): Quicksand H1, `dl` on tokens, edit as a
  secondary `Button`, "back" as a ghost/link `Button`, section dividers 1px
  `border` (drop `border-zinc-200 dark:border-zinc-800`).
- Growth/watering sections + rows + forms: tokens + restyled inputs/buttons;
  list ordering, validation, CRUD, and delete-confirm behavior **unchanged**.
- Charts: `GrowthChart` line stroke → `forest #2F6B3F` (was `#16a34a`);
  `WateringChart` line stroke → `clay #A9744E` (was `#2563eb`, blue). Grid /
  axis classes move off `zinc`/`dark:` onto `border`/`stone` tokens. Chart
  data, axes, empty/error states, and the `<figure>` accessible names are
  unchanged (FR-CHART behavior intact).

### D8 — Error handling strategy

Pure restyle — no new failure modes. The shared inline-error contract
(FR-SHELL-03: `FieldError` + `FormErrorBanner`, `role="alert"`,
`aria-describedby` wiring) is preserved exactly; only the visual treatment
changes (danger token instead of `red-600`). No raw 500s, no silent truncation —
unchanged from the owning capabilities. Removing the theme code removes a
try/catch-guarded localStorage path, which only ever degraded silently; nothing
downstream depends on it.

## Data model

No data-model change. No schema, no migration. `intervalDays` / derived watering
status (which the real status pill will consume) are **slice 7 (FR-REM-*)**; this
slice's card pill is a static placeholder.

## Risks & mitigations

- **R1 — Dropping the no-flash test loses a regression guard.** Mitigation:
  replace it with a test asserting the theme machinery is GONE (no toggle
  control, no `ThemeProvider`) so a half-reintroduced toggle fails CI (D3).
- **R2 — Stray `dark:` variants / hard-coded hex left behind after the
  restyle** would silently violate FR-DS-01/FR-SHELL-02a. Mitigation: a
  `grep -r "dark:" app components` sweep in the final battery must return
  nothing, and a token-presence test pins the `@theme` vars; a manual scan for
  non-token hex in the restyled files.
- **R3 — Contrast regressions** (e.g. `stone` muted text on `cloud`, status
  chip text). Not unit-checkable; mitigation: Phase 6 axe + vision-verify on the
  paper theme gate this (NFR-A11Y-01/02). The spec records forest-on-paper as
  the headline AA pair.
- **R4 — `next/font` fonts not actually applied** (CSS var declared but body
  still falls back). Mitigation: the layout wires the font-variable classes on
  `<html>`/`<body>` and the build/visual pass catches a missing family; the
  token test asserts the three families are declared in the theme.
- **R5 — 360 px overflow** from the 56px section padding / 1080px max-width.
  Mitigation: padding scales down on mobile; verified in the Phase 6 360 px
  responsive pass (NFR-COMPAT-01), not asserted in unit tests.

## Review-gate dispositions (slice-6 review)

Recorded so the dispositions survive in the spec, not just the gate output:

- **FR-DS-03 card action is a presentational placeholder — accepted.** The whole
  card is a single keyboard-operable `<Link href="/plants/[id]">`; the
  "water now" affordance is rendered as an `aria-hidden` `<span>` styled like a
  Button (a nested interactive control inside the card link would be invalid
  HTML). The real INTERACTIVE water action lands in slice 7 (FR-REM-*) with a
  proper accessible name. This is the spec-mandated state for this slice (the
  pill + action ship as a static placeholder pattern, healthy by default) and is
  not a defect.

- **FR-DS-06 chart palette legibility.** The named forest/clay strokes
  (growth `#2F6B3F`, watering `#A9744E`) are now locked against regression by a
  cheap unit assertion (`components/charts/chart-palette.test.tsx`, `@trace
  FR-DS-06`) that captures the `stroke` prop each chart passes to its Recharts
  `<Line>`. The RENDERED legibility / AA contrast of the lines on the paper
  theme remains verified in the Phase 6 vision-verify + axe pass (jsdom paints
  no pixels), as the FR-DS-06 contrast scenarios state.

- **Security dimension — clean, no defects.** The review's security pass found
  no introduced vulnerability: (a) authentication & sessions — N/A (the slice
  removes a pre-hydration `<head>` theme script and adds no cookie/token/session
  surface; net attack-surface reduction), and authorization is N/A in this
  intentionally authless single-Owner app (NFR-SEC-01, TC-04); (b) injection —
  clean (all new dynamic content renders through React-escaped JSX text nodes;
  no `dangerouslySetInnerHTML`/href-injection sink; the only `href` interpolates
  a numeric `id`); (c) secrets & config — clean (no `.env`/package/lockfile
  changes, no `NEXT_PUBLIC` additions; `next/font` self-hosts the Google fonts at
  build time with no credentials). The two contested security notes —
  dependencies (no manifest changed; per-diff audit delta empty) and abuse
  resistance / mass assignment (forms changed cosmetically only; no field names,
  submit handlers, or server actions touched; single-role schema with no
  privileged attribute to over-post; no auth endpoint to rate-limit) — are
  likewise clean-dimension non-defects for this slice.
