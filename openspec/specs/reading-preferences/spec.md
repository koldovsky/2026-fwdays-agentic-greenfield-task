## Purpose

The `reading-preferences` capability provides the Display panel and the global, persisted reading
preference model. It gives the reader control over how a book renders: four reading themes (Light /
Sepia / Dark / Parchment), three typefaces (Newsreader / Literata / Sans), a text-size slider, a
Paged/Scroll layout toggle, and three spacing densities. Preferences are a single global set shared
across every book, persisted to `localStorage` (`edda.reading-preferences`), and applied to the book
content document through the navigator's `applyPreferences` method via direct CSS injected into the
content document through the reader-frame CSS seam (`buildReadingCss` + `renderer.setStyles`). App
chrome (Tailwind / design-system) is never touched by these preferences; only the book content
document inside the isolated reader frame is restyled.

Visual specification: `doc/mobile/04-reading-themes-and-preferences.png` ("ONE COMPONENT, FOUR MOODS").

## Requirements

### Requirement: Display preferences panel

The reader SHALL provide a **Display** panel that opens from the reader's "Aa" button (owned by
`reader-navigation`) and is dismissable. The panel SHALL present, in order, the sections shown in
`doc/mobile/04-reading-themes-and-preferences.png`: a `Display` title with a close control; **THEME**
(four swatches); **TYPEFACE** (three swatches); **TEXT SIZE** (a slider with a point-size label);
**LAYOUT** (a Paged/Scroll segmented control); and **SPACING** (three density options). The panel is app
chrome (it MAY use Tailwind / `design-system` primitives); only the *book content* it controls is styled
via the reader-frame CSS seam (book typography reaches the content document inside the isolated frame,
never the Tailwind app chrome).

#### Scenario: Panel matches the maket

- **WHEN** the Display panel is open
- **THEN** it shows a `Display` title with a close control, a **THEME** section of four "Aa" swatches
  (Light, Sepia, Dark, Parchment), a **TYPEFACE** section of three "Ag" swatches (Newsreader, Literata,
  Sans), a **TEXT SIZE** slider with a point-size label (e.g. `17pt`), a **LAYOUT** Paged/Scroll
  segmented control, and a **SPACING** row of three density options
- **AND** its composition matches `doc/mobile/04-reading-themes-and-preferences.png`

#### Scenario: Panel opens from the reader "Aa" button

- **WHEN** the user activates the reader's "Aa" button
- **THEN** the Display panel opens over the reading view
- **AND** activating the close control (or dismissing the panel) returns to the reading view

#### Scenario: Current preferences are reflected as selected

- **WHEN** the Display panel opens
- **THEN** the swatches and controls show the currently active preferences as selected (e.g. the active
  theme swatch, typeface swatch, layout segment, and spacing option are highlighted, and the slider sits
  at the current text size)

### Requirement: Four reading themes restyle the book canvas

The system SHALL offer exactly four reading themes — **Light**, **Sepia**, **Dark**, and **Parchment**
(aged paper) — shown as "Aa" swatches. Selecting a theme SHALL change the **book reading canvas**
(background and text of the rendered content) to that theme via the navigator, producing the four moods
in `doc/mobile/04-reading-themes-and-preferences.png`. The book theme SHALL be driven by the user's
explicit choice, not by the operating-system color scheme.

Theme colors applied via `html,body{background/color !important}` through the reader-frame CSS seam:
Light (`#faf8f3` / `#2b2a26`), Sepia (`#f1e7d0` / `#5b4a36`), Dark (`#1b1714` / `#e7e1d4`),
Parchment (`#d9d0b0` / `#3a3424`).

#### Scenario: Selecting Light themes the book light

- **WHEN** the user selects the **Light** theme
- **THEN** the rendered book content shows a near-white background with dark text, matching the LIGHT
  frame of `doc/mobile/04-reading-themes-and-preferences.png`

#### Scenario: Selecting Sepia themes the book sepia

- **WHEN** the user selects the **Sepia** theme
- **THEN** the rendered book content shows a warm cream background, matching the SEPIA frame of
  `doc/mobile/04-reading-themes-and-preferences.png`

#### Scenario: Selecting Dark themes the book dark

- **WHEN** the user selects the **Dark** theme
- **THEN** the rendered book content shows a near-black background with light text, matching the DARK
  frame of `doc/mobile/04-reading-themes-and-preferences.png`

#### Scenario: Selecting Parchment themes the book aged-paper

- **WHEN** the user selects the **Parchment** theme
- **THEN** the rendered book content shows the aged-paper (warm tan/olive) background, matching the
  PARCHMENT frame of `doc/mobile/04-reading-themes-and-preferences.png`

#### Scenario: Theme follows the reader's choice, not the OS

- **WHEN** the user has selected a reading theme and the operating-system color scheme differs from it
- **THEN** the book renders in the user's selected theme regardless of the OS color scheme

### Requirement: Typeface selection restyles the book font

The system SHALL offer three typefaces — **Newsreader**, **Literata**, and **Sans** — shown as "Ag"
swatches. Selecting a typeface SHALL change the typeface of the **rendered book text** (overriding the
publication's own fonts) via the navigator, using fonts available offline.

Typeface stacks applied via `body{font-family !important}` through the reader-frame CSS seam:
Newsreader (`'Newsreader', ui-serif, Georgia, …`), Literata (`'Literata', ui-serif, Georgia, …`),
Sans (`ui-sans-serif, system-ui, -apple-system, …`). A legacy or hostile `fontFamily` value that is
not an exact member of the known stack allowlist is dropped before reaching the CSS output.

#### Scenario: Selecting a typeface re-renders the book in that family

- **WHEN** the user selects a typeface (e.g. Literata)
- **THEN** the rendered book text is displayed in the selected typeface, overriding the publication's
  embedded fonts

#### Scenario: Typeface swatches match the maket

- **WHEN** the Display panel is open
- **THEN** the TYPEFACE section shows three "Ag" swatches labelled Newsreader, Literata, and Sans, as in
  `doc/mobile/04-reading-themes-and-preferences.png`

### Requirement: Text size control restyles the book

The system SHALL provide a text-size slider with a point-size label (e.g. `17pt`). Changing the slider
SHALL change the size of the **rendered book text** via the navigator, and SHALL update the displayed
point-size label to the new value.

Text size is modelled in points (`textSizePt`), clamped to `[10, 40]`, and mapped to a percentage of a
pinned 12pt base (`Math.round(pt / 12 * 100)%`), emitted as `body{font-size: %!important}`. A
non-finite or out-of-range value is clamped or defaulted to 17pt before reaching the CSS output.

#### Scenario: Increasing the slider enlarges the book text

- **WHEN** the user increases the text-size slider
- **THEN** the rendered book text becomes larger
- **AND** the point-size label updates to the new value

#### Scenario: Decreasing the slider reduces the book text

- **WHEN** the user decreases the text-size slider
- **THEN** the rendered book text becomes smaller
- **AND** the point-size label updates to the new value

### Requirement: Layout control switches paged and scroll reading

The system SHALL provide a **Paged / Scroll** segmented control. Selecting **Paged** SHALL render the
book as discrete paginated pages; selecting **Scroll** SHALL render the book as one continuously
scrolling column. The change SHALL apply to the rendered book via the navigator.

Layout switches both the foliate flow mode (`renderer.setAttribute('flow', 'paginated'|'scrolled')`)
and the CSS applied on each preference change, so visual and pagination state stay in sync.

#### Scenario: Switching to Scroll makes the book scroll continuously

- **WHEN** the user selects **Scroll** in the Layout control
- **THEN** the rendered book becomes a single continuously scrollable column rather than discrete pages

#### Scenario: Switching to Paged paginates the book

- **WHEN** the user selects **Paged** in the Layout control
- **THEN** the rendered book is presented as discrete paginated pages

### Requirement: Spacing density restyles the book

The system SHALL offer three spacing densities, shown as the three density options in the SPACING
section. Selecting a density SHALL change the line/paragraph spacing of the **rendered book content** via
the navigator.

Spacing presets applied via `body{line-height!important}` and `p{margin-block!important}` through the
reader-frame CSS seam: compact (`1.4` / `0.4em`), cozy (`1.6` / `0.8em`), relaxed (`1.9` / `1.25em`).

#### Scenario: Selecting a looser density increases book spacing

- **WHEN** the user selects a looser spacing density
- **THEN** the rendered book content shows increased line/paragraph spacing

#### Scenario: Selecting a tighter density decreases book spacing

- **WHEN** the user selects a tighter spacing density
- **THEN** the rendered book content shows reduced line/paragraph spacing

### Requirement: Preferences style book content via the navigator, not app chrome

All reading preferences SHALL be applied to the **book content document** through the navigator's
`applyPreferences` method (direct CSS injected into the content document via the reader-frame CSS seam).
Applying a preference SHALL NOT restyle the app chrome (the surrounding sidebar/canvas built from
`design-system` tokens); the app chrome SHALL retain its design-system styling regardless of the selected
reading theme.

#### Scenario: Styling targets the navigator's content, not the app chrome

- **WHEN** the user changes any reading preference (theme, typeface, text size, layout, or spacing)
- **THEN** the styling is applied inside the navigator's book content (the rendered book changes)
- **AND** the surrounding app chrome keeps its design-system tokens/appearance unchanged

#### Scenario: Preference changes flow through applyPreferences

- **WHEN** any reading preference changes
- **THEN** the navigator's `applyPreferences` is invoked with the updated preferences
- **AND** the preferences passed are a plain serializable snapshot (so the `markRaw`-ed navigator's
  internal state is not corrupted by reactivity)

### Requirement: Preferences are global and persist across sessions and books

Reading preferences SHALL be a single global set shared by every book (not per-book). They SHALL persist
across reloads/sessions via `localStorage` key `edda.reading-preferences`, and the persisted preferences
SHALL be applied to the next book opened, before that book first renders, so the book opens already
styled (no flash of default styling). A corrupt or partial persisted blob SHALL fall back to defaults
without throwing.

#### Scenario: Preferences persist after reload

- **WHEN** the user changes preferences (e.g. Dark theme, Literata, Scroll), then reloads the app and
  reopens the reader
- **THEN** the previously selected preferences are restored and applied to the book

#### Scenario: Preferences carry across books

- **WHEN** the user sets preferences while reading one book, then opens a different book
- **THEN** the same global preferences are applied to the newly opened book

#### Scenario: Preferences apply on book open without a flash

- **WHEN** a book is opened with persisted preferences present
- **THEN** the navigator receives those preferences as it is created (via `structuredClone(toRaw())`)
- **AND** the book renders in the persisted theme/typeface/size/layout/spacing from first paint (it does
  not first appear in default styling)
