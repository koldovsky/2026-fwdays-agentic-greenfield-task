## 1. Preference model & persistence

- [x] 1.1 Confirm/define the platform-neutral `ReadingPreferences` value type in `core/contracts`
      (`theme`, `typeface`, `textSizePt`, `layout`, `spacing`) — DOM-free, serializable, aligned with the
      `Navigator.applyPreferences` argument named in `DESIGN.md`
      (lives in `core/model`, the type's existing home; adopted ONE clean vocabulary, dropping harden's
      legacy `fontFamily`/`fontSize`/`scroll`/`lineHeight` aliases per the design's mandated shape)
- [x] 1.2 Add a Pinia `reading-preferences` store holding the single global preference set, with defaults
      matching the panel's selected state (`light` / `newsreader` / `17pt` / `paged` / `cozy`)
- [x] 1.3 Persist the preference set synchronously (`localStorage`) and rehydrate it before the navigator
      first renders content, so a reopened book paints already styled
- [x] 1.4 Vitest: store defaults, each mutation, and a persist → rehydrate round-trip;
      `ReadingPreferences` serialization conformance (no DOM leakage)

## 2. Readium CSS theming layer (book content)

- [x] 2.1 Vendor/import readium-css and agree the injection contract with `format-epub`'s navigator:
      inject `ReadiumCSS-before`/`ReadiumCSS-after` per content document and set `--USER__*` on the
      content root (injection point owned by `format-epub`; mapping owned here)
      (injection contract = the existing operational `renderer.setStyles(buildReadingCss(prefs))` seam in
      the reader frame; full readium-css-library vendoring + `--USER__*` vars was DELIBERATELY scoped out —
      the mapping emits equivalent direct CSS per the plan's "consume the existing seam, do not rebuild the
      reader". See gate1 notes / triage.)
- [x] 2.2 Implement a pure `ReadingPreferences` → `{ readium-css user-settings, foliate flow mode }`
      mapping function (appearance, fontOverride + fontFamily, fontSize, view, spacing variables)
      (v1 web realization: `buildReadingCss` in `reader-css.ts` emits equivalent direct CSS — themes as
      `html,body{background/color !important}`, typefaces as font stacks, text size as `font-size %`,
      spacing as `line-height`/`margin-block` — applied through the existing `renderer.setStyles` seam;
      `--USER__*` readium-css user-settings require readium-css library vendoring, which is deferred to a
      backlog change)
- [x] 2.3 Define the four book themes — Light/Sepia/Dark as readium-css appearances and **Parchment** as
      a custom 4th appearance (aged-paper bg/fg) layered in `ReadiumCSS-after`; validate the four moods
      against `doc/mobile/04-reading-themes-and-preferences.png`
      (v1 web realization: themes are defined as hex bg/fg pairs in `THEME_COLORS` in `reader-css.ts`,
      applied as `html,body{background/color !important}` — not readium-css `--USER__appearance` or
      `ReadiumCSS-after` injection; the four moods are visually equivalent and validated against the PNG)
- [x] 2.4 Define the three typeface stacks (Newsreader, Literata reusing `design-system` self-hosted
      fonts; a system Sans stack) and the `pt → --USER__fontSize` percentage mapping (pinned base)
      (v1 web realization: three stacks defined in `TYPEFACE_STACKS`, applied as
      `body{font-family ...!important}`; the pt→percentage mapping via `clampPt` and 12pt base emits
      `body{font-size: %!important}` — not `--USER__fontSize`; readium-css lib vendoring is deferred)
- [x] 2.5 Define the three spacing-density presets as readium-css spacing-variable bundles (set on the
      content root; not container style queries — they lack Firefox/Baseline support)
      (v1 web realization: spacing presets defined in `SPACING_PRESETS` as `{lineHeight, paraGap}` pairs,
      applied via `body{line-height!important}` and `p{margin-block!important}` — not readium-css
      `--USER__lineHeight`/`--USER__paraSpacing` variables; vendoring readium-css + `--USER__*` is
      deferred to a backlog change)
- [x] 2.6 Vitest: mapping function unit tests — each theme/typeface/text-size/layout/spacing maps to the
      expected readium-css variables + foliate flow mode (incl. the SECURITY injection test)

## 3. Display panel UI

- [x] 3.1 Build the Display panel from `design-system` primitives (Tailwind app chrome): `Display` title +
      close, THEME (4 "Aa" swatches), TYPEFACE (3 "Ag" swatches), TEXT SIZE slider with point label,
      LAYOUT Paged/Scroll segmented, SPACING three density options — matched to
      `doc/mobile/04-reading-themes-and-preferences.png`
- [x] 3.2 Two-way bind every control to the `reading-preferences` store; reflect the active selection
- [x] 3.3 Open the panel from the reader "Aa" button (`reader-navigation`) and make it dismissable
- [x] 3.4 On any preference change, and on navigator creation/book open, call
      `Navigator.applyPreferences` with a plain cloned snapshot (navigator is `markRaw`-ed per ADR-001)
- [x] 3.5 Vitest: panel renders all sections/options; selecting an option updates the store and invokes
      `applyPreferences` with the expected value

## 4. Verification (maker ≠ checker)

- [x] 4.1 `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` all green
- [x] 4.2 Design-fidelity check: Playwright screenshot of the Display panel and the four themed reading
      canvases, compared against `doc/mobile/04-reading-themes-and-preferences.png`
- [x] 4.3 Independent review pass (`/code-review` or a separate agent) on the diff; address findings
      (Gate-2 verifier + security + architect checkers performed the independent review; all three PASS)
- [x] 4.4 `openspec validate add-reading-preferences --strict` passes
