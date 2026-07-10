## Why

**Sequencing:** change 8 of 11 (see `doc/plans/web-app-roadmap.md`). Depends on `add-reader-navigation`
(change 7, the reader chrome + the "Aa" toggle) and transitively on `add-format-epub` (change 6, the
foliate `Navigator` and its `applyPreferences` seam). Unblocks `add-offline-and-sync` (change 9).

By change 7 the reader can open, render, and navigate a real EPUB, but the reader gives the user **no
control over how the book reads**. Screen 04 of the maket
(`doc/mobile/04-reading-themes-and-preferences.png`, "ONE COMPONENT, FOUR MOODS") specifies that
control: a **Display** panel with four reading themes (Light / Sepia / Dark / Parchment), three
typefaces (Newsreader / Literata / Sans), a text-size slider, a Paged/Scroll layout toggle, and three
spacing densities — and the four phone mock-ups beside it show the *same book* re-themed four ways.

Crucially these preferences style the **book content**, which per the load-bearing invariant lives in
**readium-css inside the foliate navigator**, not Tailwind app chrome. This change owns the preference
model, the four book themes, the panel, and global persistence; it *drives* the book restyle through the
navigator's existing `applyPreferences` method rather than touching book typography directly.

## What Changes

- Add the **Display preferences panel** matching `doc/mobile/04-reading-themes-and-preferences.png`:
  a sheet with **THEME** (four "Aa" swatches), **TYPEFACE** (three "Ag" swatches), **TEXT SIZE**
  (a slider with a point-size label, e.g. `17pt`), **LAYOUT** (a Paged / Scroll segmented control), and
  **SPACING** (three density options). It opens from the reader's "Aa" button (owned by
  `reader-navigation`) and is built from `design-system` primitives (segmented control, swatches, slider).
- Define the **four reading themes** for the book reading canvas — Light, Sepia, Dark, and Parchment
  (aged paper) — as readium-css appearances (Parchment is a custom 4th appearance Edda adds; readium-css
  ships only three). Selecting a theme re-themes the rendered book. *(V1 realization: themes are applied
  as direct hex bg/fg CSS via the existing `renderer.setStyles` seam — not readium-css
  `--USER__appearance`; readium-css library vendoring + `--USER__*` user-settings is a deferred backlog
  change.)*
- Define **typeface override** (Newsreader / Literata / Sans), **text size**, **paged-vs-scroll layout**,
  and **spacing density**, each mapped onto readium-css user settings and the foliate flow mode.
  *(V1 realization: all four controls emit equivalent direct CSS via `buildReadingCss` + `setStyles` in
  the reader frame — font stacks, clamped `font-size %`, `line-height`, `margin-block` — rather than
  `--USER__*` readium-css properties; functionally equivalent outcomes, `--USER__*` deferred.)*
- Add a single **global `ReadingPreferences`** value (one preference set, shared across every book),
  held in a **Pinia** store and **persisted** so it survives reloads and applies to the next book opened.
- **Apply preferences to book content only:** all of the above reach the book through
  `Navigator.applyPreferences(...)` (readium-css inside the navigator). App chrome (Tailwind / the
  parchment canvas) is untouched — the panel's own chrome is Tailwind, but the *book* styling is not.

## Capabilities

### New Capabilities

- `reading-preferences`: the Display panel plus the global, persisted reading-preference model (four
  book themes, three typefaces, text size, paged/scroll, spacing density) that restyles the **book
  content** through the navigator's `applyPreferences` (v1: via direct CSS through the reader-frame
  `setStyles` seam; readium-css `--USER__*` deferred), matched to
  `doc/mobile/04-reading-themes-and-preferences.png`.

### Modified Capabilities

- None (greenfield).

## Impact

- Code: a `reading-preferences` Pinia store (`src/app/stores/`), the Display panel component and its
  swatch/slider/segmented sub-components (`src/app/reader/preferences/`), a pure
  `ReadingPreferences` → readium-css user-settings mapping module, the four theme definitions, and
  vendored **readium-css** assets injected into the foliate content document.
- Contracts (referenced, not redefined here): the platform-neutral `ReadingPreferences` value type is
  the argument already named by `Navigator.applyPreferences` in `DESIGN.md`; it must stay DOM-free so
  the native client can re-express it. The readium-css *application* is web-only and lives at the
  navigator seam.
- Cross-capability seams (see `design.md`): consumes `Navigator.applyPreferences` and readium-css
  injection from `format-epub` (change 6); opens from the "Aa" toggle in `reader-navigation`
  (change 7); reuses `design-system` primitives and self-hosted fonts (change 1). No `connector/` or
  sync changes; preference persistence is a small global setting, independent of `offline-storage`
  (change 9).
