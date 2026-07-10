## ADDED Requirements

### Requirement: Detail header controls

The book detail screen SHALL present a header row containing, from left: a "← Back" control, a monospace
breadcrumb of the book's browse location (e.g. `home server / fiction / austen`), and, at the right edge,
a share control and a "…" (more) control. The breadcrumb SHALL use the design-system monospace face.
Activating Back SHALL return the user to the browse context they came from (the `library-browse` screen).
The header SHALL match `doc/web/02-book-detail-desktop.png`.

#### Scenario: Header renders the maket's top row

- **WHEN** the book detail screen renders
- **THEN** the header shows a "← Back" control, a monospace breadcrumb reading `home server / fiction /
  austen`, and a share control and a "…" more control at the right edge, matching
  `doc/web/02-book-detail-desktop.png`

#### Scenario: Back returns to the browse context

- **WHEN** the user activates the Back control
- **THEN** the app navigates back to the library browse screen the book was opened from

#### Scenario: Breadcrumb uses the monospace face

- **WHEN** the breadcrumb renders
- **THEN** it uses the design-system monospace face, matching the breadcrumb styling in
  `doc/web/02-book-detail-desktop.png`

### Requirement: Two-column detail composition

The screen SHALL lay out its content in two columns below the header: a left column holding the large
cover above the action stack, and a right column holding the identity/metadata block, the progress and
per-format cards, and the chapters section — matching the composition of
`doc/web/02-book-detail-desktop.png`. The layout SHALL remain readable at common desktop widths without
the columns overlapping or clipping.

#### Scenario: Two-column layout matches the maket

- **WHEN** the book detail screen renders at desktop width
- **THEN** the cover and action stack occupy the left column and the identity, cards, and chapters occupy
  the right column, beneath the header, matching `doc/web/02-book-detail-desktop.png`

#### Scenario: Layout does not break when narrowed

- **WHEN** the viewport is narrowed to a smaller desktop width
- **THEN** the two columns reflow without overlapping or clipping content

### Requirement: Book identity and metadata

The screen SHALL display the book's identity from the connector's `getBook` result (`BookMeta` in
`core-domain-model`): a large cover image, the title in the serif display face, the author, a row of
metadata pills, and a description paragraph. The metadata pills SHALL show the available facts — for the
maket book: publication year (`1813`), language (`English`), page count (`432 pages`), and genres
(`Fiction · Romance`). Pills for facts absent from `BookMeta` SHALL be omitted without breaking the row.
The identity block SHALL match `doc/web/02-book-detail-desktop.png`.

#### Scenario: Identity block matches the maket

- **WHEN** the screen renders for the maket book
- **THEN** it shows the cover, the serif title "Pride and Prejudice", the author "Jane Austen", the
  metadata pills `1813` / `English` / `432 pages` / `Fiction · Romance`, and the description paragraph,
  matching `doc/web/02-book-detail-desktop.png`

#### Scenario: Metadata sourced from BookMeta

- **WHEN** the screen loads a book
- **THEN** its title, author, language, page count, genres, description, and cover are read from the
  connector's `getBook` (`BookMeta`) for the current `(sourceId, bookId)`, not hard-coded

#### Scenario: Missing optional metadata omits its pill

- **WHEN** `BookMeta` lacks an optional fact (e.g. no language or no page count)
- **THEN** the corresponding pill is omitted and the remaining pills still render in a single row without
  a gap or placeholder

### Requirement: Reading-progress card

The screen SHALL display a "YOUR PROGRESS" card for the book's current format showing: a large percentage
(`38%`), an estimated time remaining (`about 1h 12m left`), a progress bar reflecting that percentage, and
a last-read line (`Last read 2h ago on Phone`). The percentage and bar SHALL derive from the
`totalProgression` of the `Locator` keyed for the current `(sourceId, bookId, mediaType)`. The card SHALL
match `doc/web/02-book-detail-desktop.png`.

#### Scenario: Progress card matches the maket

- **WHEN** the book has saved progress for its current format
- **THEN** the "YOUR PROGRESS" card shows the large `38%`, `about 1h 12m left`, a progress bar filled to
  ~38%, and `Last read 2h ago on Phone`, matching `doc/web/02-book-detail-desktop.png`

#### Scenario: Percentage derives from the locator

- **WHEN** the current format's `Locator` has a `totalProgression` of 0.38
- **THEN** the card shows `38%` and the progress bar is filled to ~38%

#### Scenario: No saved progress shows a not-started state

- **WHEN** there is no stored `Locator` for the current `(sourceId, bookId, mediaType)`
- **THEN** the card shows a not-started / 0% state rather than a stale or missing value

### Requirement: Per-format progress keying explainer

The screen SHALL display a "SYNCED PER FORMAT" card that surfaces the per-`(sourceId, bookId, mediaType)`
progress-keying invariant from `core-domain-model`, with the maket's text: "Your EPUB position (Phone) and
the PDF (Desktop) keep separate places — progress is keyed per format." The progress shown elsewhere on
the screen SHALL be the position for the current `(sourceId, bookId, mediaType)`, such that the same title
in a different media type keeps a separate position. The card SHALL match
`doc/web/02-book-detail-desktop.png`.

#### Scenario: Explainer card text matches the maket

- **WHEN** the screen renders
- **THEN** a "SYNCED PER FORMAT" card reads "Your EPUB position (Phone) and the PDF (Desktop) keep
  separate places — progress is keyed per format.", matching `doc/web/02-book-detail-desktop.png`

#### Scenario: Progress is keyed per media type

- **WHEN** the same `(sourceId, bookId)` is available in two media types (e.g. EPUB and PDF)
- **THEN** the progress card reflects the `Locator` for the currently selected media type only
- **AND** switching to the other media type would show that media type's own separate position

### Requirement: Reading actions

The screen SHALL provide the maket's action stack beneath the cover: a primary "Continue reading" button,
an "Offline" (download) button, and a bookmark toggle. "Continue reading" SHALL open the app-shell reader
route `/reader/:sourceId/:bookId/:mediaType` for the format being continued and SHALL carry the saved
locator so the reader resumes in place. The action stack SHALL match `doc/web/02-book-detail-desktop.png`.

#### Scenario: Actions match the maket

- **WHEN** the screen renders
- **THEN** beneath the cover it shows a primary "Continue reading" button, an "Offline" download button,
  and a bookmark toggle, matching `doc/web/02-book-detail-desktop.png`

#### Scenario: Continue reading opens the format-keyed reader route

- **WHEN** the user activates "Continue reading"
- **THEN** the app navigates to `/reader/:sourceId/:bookId/:mediaType` for the format being continued
- **AND** the saved `Locator` for that `(sourceId, bookId, mediaType)` is passed so the reader resumes at
  the last position (or the start when there is none)

#### Scenario: Offline triggers a download and bookmark toggles

- **WHEN** the user activates "Offline"
- **THEN** an offline download of the book is requested through the offline-storage interface
- **AND** activating the bookmark toggle flips the book's bookmarked state

### Requirement: Chapters table of contents

The screen SHALL display a "CHAPTERS" section showing the chapter count (e.g. `61 chapters`) and a list of
numbered table-of-contents rows, each with the chapter number, the chapter title, and a page reference
(e.g. `p. 162`). The row corresponding to the current reading position SHALL be marked as current with a
play ▸ marker. The list SHALL be sourced from `Publication.toc` (`core-domain-model`), which is fully
populated once `add-format-epub` lands; before then the section SHALL render a graceful placeholder rather
than broken rows. Activating a row SHALL open the reader at that chapter's locator. The section SHALL match
`doc/web/02-book-detail-desktop.png`.

#### Scenario: Chapters list matches the maket

- **WHEN** the table of contents is available for the maket book
- **THEN** the "CHAPTERS" section shows `61 chapters` and numbered rows including `14` "Chapter XIV — At
  Rosings" `p. 162`, `15` "Chapter XV — Mr. Collins' Proposal" `p. 174`, and `16` "Chapter XVI —
  Wickham's Account" `p. 188`, matching `doc/web/02-book-detail-desktop.png`

#### Scenario: Current chapter is marked with a play marker

- **WHEN** the current reading position falls within a chapter (e.g. chapter 14)
- **THEN** that row is marked as current with a play ▸ marker, as shown for row `14` in
  `doc/web/02-book-detail-desktop.png`

#### Scenario: Selecting a chapter opens the reader at that chapter

- **WHEN** the user activates a chapter row
- **THEN** the reader opens at that chapter's `Locator` (the row's table-of-contents target)

#### Scenario: Chapters degrade gracefully before format-epub

- **WHEN** no `Publication.toc` is available yet (before `add-format-epub` provides one)
- **THEN** the "CHAPTERS" section renders a graceful empty/placeholder state instead of broken rows
- **AND** the section becomes fully populated once a format handler supplies `Publication.toc`
