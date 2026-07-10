## Context

`doc/mobile/04-reading-themes-and-preferences.png` ("04 · READING THEMES & PREFERENCES — ONE COMPONENT,
FOUR MOODS") is the visual source of truth. It shows the same book ("Pride and Prejudice", Chapter One)
rendered four ways — **Light** (near-white), **Sepia** (warm cream), **Dark** (near-black with light
text), **Parchment · aged paper** (warm tan/olive) — plus a fifth frame: the **Display** sheet over a
dimmed book, containing, top to bottom: a drag handle and a `Display` title with a close (×) button;
**THEME** with four `Aa` swatches (Light / Sepia / Dark / Parchment, Light selected); **TYPEFACE** with
three `Ag` swatches (Newsreader / Literata / Sans, Newsreader selected); **TEXT SIZE** with a small-`A`
→ large-`A` slider showing `17pt`; **LAYOUT** with a Paged / Scroll segmented control (Paged selected);
and **SPACING** with three density icons (middle selected).

The hard constraint is the load-bearing invariant (`CLAUDE.md`, `stack.md` ADR row "Styling"): **Tailwind
styles app chrome only; book typography lives in readium-css inside the navigator iframe.** So these
preferences must reach the *book content document*, not the Vue app. The seam already exists: `DESIGN.md`
declares `Navigator.applyPreferences(p: ReadingPreferences): void` ("font, size, theme, columns, RTL…")
on the `Navigator` interface that `format-epub` (change 6) implements over foliate-js. This change owns
the *preferences* (model, themes, panel, persistence) and *drives* that seam; it does not re-implement
book rendering.

## Goals / Non-Goals

**Goals:**

- A single **global** `ReadingPreferences` value (theme, typeface, text size, layout, spacing) that is
  the same across every book and **persists** across sessions.
- The **Display** panel reproducing `doc/mobile/04-reading-themes-and-preferences.png`, opened from the
  reader "Aa" button (`reader-navigation`) and built from `design-system` primitives.
- The **four book themes** (Light / Sepia / Dark / Parchment) realised as readium-css appearances on the
  book reading canvas.
- A pure, testable mapping from `ReadingPreferences` to readium-css user settings + foliate flow mode,
  applied via `Navigator.applyPreferences`.

**Non-Goals:**

- Book rendering, foliate wiring, CFI↔Locator, and the physical readium-css injection point — owned by
  `format-epub` (change 6); this change specifies the mapping and the agreed injection contract only.
- The reader chrome and the "Aa" toggle itself — owned by `reader-navigation` (change 7).
- App-chrome theming / a global app dark mode — out of scope; only the *book canvas* is themed here.
- **Per-book** preference overrides — preferences are global for now (see Open Questions).
- Coupling persistence to OPFS/Dexie (`offline-storage`, change 9) — preferences are a tiny global setting.

## Decisions

- **`ReadingPreferences` is a platform-neutral, serializable value object.** Shape:
  `{ theme: 'light'|'sepia'|'dark'|'parchment'; typeface: 'newsreader'|'literata'|'sans';
  textSizePt: number; layout: 'paged'|'scroll'; spacing: 'compact'|'cozy'|'relaxed' }`. It carries no
  DOM and lives in `core/contracts` (the type already referenced by `Navigator.applyPreferences` in
  `DESIGN.md`), so the future Kotlin client re-expresses it and serialization conformance tests keep
  them compatible. *Alternative:* a web-only prefs object holding `HTMLElement`/style handles — rejected;
  it would violate the platform-neutral contract invariant.
- **Book styling is applied through readium-css inside the navigator, never Tailwind.** Per content
  document load, the navigator injects the readium-css stylesheets in cascade order
  (`ReadiumCSS-before.css` ahead of publisher styles, `ReadiumCSS-after.css` last to win) into the
  iframe `<head>`, and sets the `--USER__*` user-setting custom properties on the content root.
  `applyPreferences` updates those root variables live. **Ownership seam:** the *injection point* is
  `format-epub`'s navigator; **this** capability owns the theme definitions and the pure
  `ReadingPreferences → {readium-css vars, foliate flow}` mapping and calls `applyPreferences`.
  *Alternative:* style the book with Tailwind/app-level CSS — rejected; it violates the invariant, cannot
  reach the iframe content document, and abandons the Readium-aligned model (`stack.md` ADR-003).
  *(V1 realization note: the readium-css stylesheet injection + `--USER__*` property model was NOT built
  in v1 — readium-css is vendored nowhere in the codebase. The v1 web implementation consumes the existing
  `renderer.setStyles(buildReadingCss(prefs))` seam in the reader frame, emitting equivalent direct CSS
  (theme colors, font stacks, clamped percentages, spacing). The load-bearing invariant half — book
  typography reaches the content document inside the isolated frame, never the Tailwind chrome — is
  honored. Vendoring the readium-css library + switching the seam to `--USER__*` user-settings (publisher
  normalization, hyphenation, Readium alignment) is deferred to a backlog change.)*
- **Four themes = three built-in readium-css appearances + one custom.** Light → `readium-default-on`
  (day), Sepia → `readium-sepia-on`, Dark → `readium-night-on` via `--USER__appearance`. readium-css
  ships only those three, so **Parchment is a custom 4th appearance** Edda defines with its own
  aged-paper background/foreground custom properties layered in `ReadiumCSS-after`. Background moods
  (final hex validated against the PNG): Light ≈ near-white, Sepia ≈ warm cream, Dark ≈ near-black with
  warm light text, Parchment ≈ aged tan/olive. *Alternative:* expose only the three built-ins — rejected;
  the maket mandates Parchment. *(V1 realization: themes are `THEME_COLORS` hex pairs in `reader-css.ts`,
  applied as `html,body{background/color !important}` via `setStyles` — not `--USER__appearance`; the
  four moods are visually equivalent to the maket.)*
- **Never rely on `prefers-color-scheme` inside the book iframe.** Safari resolves `prefers-color-scheme`
  inside an iframe to the OS setting, ignoring the embedder's `color-scheme` (per modern-web-guidance
  `dark-mode`). The theme is therefore set *explicitly* on the content root (the readium-css appearance
  variable), so Dark/Light track the user's chosen reading theme, not the OS. *Alternative:* drive the
  book theme from system `prefers-color-scheme` — rejected; unreliable across browsers and wrong (the
  reading theme is a deliberate per-reader choice, decoupled from app/OS theme).
- **Typeface override via readium-css font settings.** Set `--USER__fontOverride: readium-font-on`
  (with `--USER__advancedSettings: readium-advanced-on`) and `--USER__fontFamily` to the chosen stack:
  the **self-hosted** Newsreader and Literata faces from `design-system` (change 1), and a system sans
  stack for "Sans". *Alternative:* keep the publisher's embedded fonts — rejected; the maket gives an
  explicit typeface control, which requires overriding. *(V1 realization: `TYPEFACE_STACKS` in
  `reader-css.ts` emits `body{font-family: ...!important}` via `setStyles` — not `--USER__fontFamily`;
  same three stacks, same override outcome.)*
- **Text size is modelled in points, mapped to a readium-css percentage at the seam.** The model stores
  `textSizePt` (the panel's human label, e.g. `17pt`); the mapping converts it to `--USER__fontSize` as a
  percentage of a pinned base. *Alternative:* store a raw percentage — rejected; the maket shows points,
  so keeping the model human-meaningful and mapping once keeps the UI and the contract honest.
  *(V1 realization: `clampPt(textSizePt) / PT_BASE * 100` emits `body{font-size: %!important}` via
  `setStyles` — not `--USER__fontSize`; same pinned-base percentage, same visual outcome.)*
- **Paged vs scroll is a two-part mapping.** Switching `layout` sets **both** the foliate flow mode
  (paginated columns vs continuous scroll — foliate owns actual pagination) **and** readium-css
  `--USER__view` (`readium-paged-on` / `readium-scroll-on`) so the CSS expectations match the flow.
  *Alternative:* toggle `--USER__view` alone — rejected; the CSS variable does not repaginate foliate by
  itself.
- **Spacing density = three named presets, each a bundle of readium-css spacing variables** (e.g.
  `--USER__lineHeight`, `--USER__paraSpacing`, word/letter spacing) set on the content root.
  *Alternative:* a CSS container style query keyed on a density token — rejected; container style queries
  are not Baseline (no Firefox, per modern-web-guidance `design-token-reactivity`) and readium-css
  already drives spacing through root custom properties. *(V1 realization: `SPACING_PRESETS` in
  `reader-css.ts` emits `body{line-height!important}` and `p{margin-block!important}` via `setStyles` —
  not `--USER__lineHeight`/`--USER__paraSpacing`; equivalent compact/cozy/relaxed density outcomes.)*
- **One global preference set, persisted synchronously, rehydrated before first book paint.** A Pinia
  store holds the single `ReadingPreferences`; it is persisted to `localStorage` and rehydrated
  *synchronously* before the navigator first renders content, so a reopened book paints already themed
  (no flash of default styling). *Alternative:* persist via Dexie — rejected here; its async read risks a
  themed-content flash, and OPFS/Dexie is `offline-storage`'s (change 9) concern, not a tiny global
  setting's.
- **`markRaw` the navigator; pass plain values across the seam.** Per ADR-001 the `Navigator` is
  `markRaw()`-ed; `applyPreferences` receives a plain, cloned `ReadingPreferences` snapshot (not a Vue
  reactive proxy), so store reactivity never corrupts foliate's imperative state. *Alternative:* hand the
  reactive store object to the navigator — rejected; it leaks proxies into the renderer.
- **Defaults match the panel's selected state:** `theme: 'light'`, `typeface: 'newsreader'`,
  `textSizePt: 17`, `layout: 'paged'`, `spacing: 'cozy'` (the middle density). Final values validated
  against the PNG.

## Risks / Trade-offs

- [Parchment is not a built-in readium-css appearance and may fight the readium-css cascade] → define it
  as an explicit custom appearance whose overrides are injected in `ReadiumCSS-after` (last, so it wins),
  and validate the four moods against `doc/mobile/04-reading-themes-and-preferences.png`.
- [pt → percentage font-size mapping can drift from the `17pt` label] → pin a single base and a documented
  formula in the mapping module, and snapshot-test the mapping for the slider's range.
- [Async persistence would flash a default-themed book before prefs load] → synchronous `localStorage`
  rehydrate, and apply preferences on navigator creation so the book opens already styled.
- [Reactive store values leaking into foliate via `applyPreferences` corrupt the renderer] → `markRaw()`
  the navigator (ADR-001) and pass a plain cloned snapshot.
- [Ambiguous ownership between this capability and `format-epub` over readium-css] → this design fixes the
  seam: `format-epub` owns the injection point (`applyPreferences` + stylesheet injection), this
  capability owns the model, theme definitions, and the pure mapping; a mapping unit test is the contract.
- [Safari iframe `prefers-color-scheme` resolving to system would mis-theme the book] → never read system
  scheme inside the content document; set the theme explicitly on the content root.

## Open Questions

- Exact theme background/foreground hexes for the four moods (esp. custom Parchment) — finalised against
  `doc/mobile/04-reading-themes-and-preferences.png` during implementation, mirroring how `add-app-shell`
  deferred reading-theme hexes to this change.
- The text-size range and step (panel shows `17pt`) and the three spacing presets' exact variable values
  — finalised against the PNG.
- Whether `ReadingPreferences` lands in `core/contracts` or `core/model` — assumed `core/contracts` since
  `Navigator.applyPreferences` already references it; reconcile with the `core-domain-model` owner
  (`add-library-browse`, change 2).
- Per-book / per-publication preference overrides — out of scope now; the global model leaves room to add
  a per-book layer later.
