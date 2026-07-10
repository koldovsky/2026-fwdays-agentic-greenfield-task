## ADDED Requirements

### Requirement: Reader top bar

The Reader screen SHALL present a top bar containing a back control labelled "← Library", a centered
publication title in the serif display face with the author shown beneath it, and a right-aligned
control cluster (a table-of-contents control, a bookmark control, and an "Aa" control). The top bar
SHALL match `doc/web/03-reader-desktop-epub-spread.png`.

#### Scenario: Top bar matches the maket

- **WHEN** the Reader screen renders an open publication
- **THEN** the top bar shows "← Library" at the left, the serif title (e.g. "Pride and Prejudice")
  with the author beneath it (e.g. "JANE AUSTEN") centered, and a TOC, bookmark, and "Aa" control at
  the right, matching `doc/web/03-reader-desktop-epub-spread.png`

#### Scenario: Back control returns to the library

- **WHEN** the user activates the "← Library" control
- **THEN** the app navigates away from the reader route back to the library view (owned by
  `library-browse`)
- **AND** the navigator is destroyed as part of leaving the route

### Requirement: Top-bar controls — TOC, bookmark, and the Aa preferences trigger

The Reader screen's right-hand controls SHALL behave as follows: the table-of-contents control SHALL
open chapter navigation built from the publication's table of contents; the bookmark control SHALL
toggle a bookmark at the current reading position; and the "Aa" control SHALL open the
reading-preferences panel. The Reader screen SHALL only trigger the preferences panel — the panel
itself is owned by `reading-preferences`.

#### Scenario: Aa opens the reading-preferences panel

- **WHEN** the user activates the "Aa" control (shown active in
  `doc/web/03-reader-desktop-epub-spread.png`)
- **THEN** the Reader screen requests the reading-preferences panel to open
- **AND** the Reader screen does not itself render the themes/typeface/size controls (those belong to
  `reading-preferences`)

#### Scenario: TOC navigates to a chapter

- **WHEN** the user opens the table-of-contents control and selects an entry
- **THEN** the navigator goes to the locator for that entry and the spread updates to that position

#### Scenario: Bookmark toggles at the current position

- **WHEN** the user activates the bookmark control
- **THEN** a bookmark is toggled at the navigator's current locator

### Requirement: Two-page parchment spread

On desktop widths the Reader screen SHALL render the publication as two facing pages on a warm
"aged-paper" parchment surface, matching `doc/web/03-reader-desktop-epub-spread.png`. Below a desktop
width breakpoint the spread MAY fall back to a single page without clipping or overlapping the chrome.

#### Scenario: Two facing pages on desktop

- **WHEN** the Reader screen renders an EPUB at a desktop width
- **THEN** the body shows two facing pages of text side by side on a parchment surface, matching the
  spread in `doc/web/03-reader-desktop-epub-spread.png`

#### Scenario: Single page at narrow widths

- **WHEN** the viewport is narrower than the two-page breakpoint
- **THEN** the spread renders a single page without clipping or overlapping the top or bottom bars

### Requirement: Page furniture — running heads, page numbers, and chapter opener

Each page of the spread SHALL display running heads and a per-page page number, and a chapter that
begins on a page SHALL show a chapter opener, all matching `doc/web/03-reader-desktop-epub-spread.png`.

#### Scenario: Running heads, page numbers, and opener match the maket

- **WHEN** the first spread of the opened publication renders
- **THEN** the running heads read "PRIDE AND PREJUDICE", "VOLUME I", and "CHAPTER ONE", the two pages
  show page numbers "1" and "2", and the chapter opener reads "CHAPTER" / "One" (drop-cap style),
  matching `doc/web/03-reader-desktop-epub-spread.png`

### Requirement: Edge chevron paging

The Reader screen SHALL render large previous and next chevron controls hugging the left and right
edges of the spread, matching `doc/web/03-reader-desktop-epub-spread.png`. Activating a chevron SHALL
turn the page.

#### Scenario: Chevrons present and turn the page

- **WHEN** the Reader screen renders
- **THEN** large previous (left) and next (right) chevrons sit at the spread's edges, matching
  `doc/web/03-reader-desktop-epub-spread.png`
- **AND** activating the next chevron advances to the following spread and the previous chevron returns
  to the prior one

### Requirement: Keyboard navigation

The Reader screen SHALL support keyboard navigation: ArrowRight and ArrowLeft SHALL change pages
forward and back, and Home and End SHALL jump to the start and end of the publication.

#### Scenario: Arrow keys change pages

- **WHEN** the reader has focus and the user presses ArrowRight, then ArrowLeft
- **THEN** the spread advances one page on ArrowRight and returns one page on ArrowLeft

#### Scenario: Home and End jump to the ends

- **WHEN** the user presses Home, then End
- **THEN** the navigator goes to the start of the publication on Home and to the end on End

### Requirement: Reading-position bar

The Reader screen SHALL present a bottom bar containing a chapter label, a draggable scrubber
reflecting the reading position within the publication, and a readout of the current page range, total
pages, and estimated time left in the chapter, matching `doc/web/03-reader-desktop-epub-spread.png`.

#### Scenario: Position bar matches the maket

- **WHEN** the first spread renders
- **THEN** the bottom bar shows the chapter label "Chapter I", a scrubber, and the readout
  "p. 1–2 / 432 · 6 min left in chapter", matching `doc/web/03-reader-desktop-epub-spread.png`

#### Scenario: Scrubber reflects and seeks position

- **WHEN** the reading position changes by paging
- **THEN** the scrubber handle moves to reflect the new total progression
- **AND** dragging the scrubber to a new position navigates the publication to that position

#### Scenario: Readout updates with position

- **WHEN** the user pages forward
- **THEN** the page-range and time-left readout update to reflect the new position

### Requirement: Renderer lifecycle and reactivity safety

The Reader screen SHALL mount the foliate `Navigator` (created by `format-epub`) into a plain
`HTMLElement`, and SHALL store the `Publication`, `Navigator`, and `Session` objects as non-reactive
references via `markRaw()` so Vue reactivity never wraps or corrupts the renderer's internal state
(ADR-001). On leaving the reader or unmounting, the Reader screen SHALL call `Navigator.destroy()`,
clear the mount element, and drop its subscriptions.

#### Scenario: Renderer objects are non-reactive

- **WHEN** the Reader screen holds the opened `Publication`, `Navigator`, and `Session`
- **THEN** those references are non-reactive (markRaw'd) — Vue does not wrap them in a reactive proxy

#### Scenario: Navigator mounts into a raw element

- **WHEN** the publication is opened
- **THEN** the navigator is created against a plain `HTMLElement` mount target, not a Vue-managed
  reactive subtree

#### Scenario: Navigator is destroyed on unmount

- **WHEN** the Reader screen unmounts or the route changes away from the reader
- **THEN** `Navigator.destroy()` is called, the mount element is cleared, and the `locatorChanged`
  subscription is removed

### Requirement: Open an EPUB from the connector or OPFS

The Reader screen SHALL open the publication identified by the route's `(sourceId, bookId, mediaType)`
by asking `format-epub` to open a `PublicationSource` whose bytes come from the connector
(`openResource`) or, once available, the OPFS cache (`offline-storage`). Book-byte range reads SHALL
bypass the service worker (ADR-005). The Reader screen SHALL render the first spread of the real
publication.

#### Scenario: Reader opens a real EPUB and renders the first spread

- **WHEN** the app navigates to `/reader/:sourceId/:bookId/:mediaType` for a real EPUB (e.g. an EPUB
  from `test-epubs/` served by the Komga test stack)
- **THEN** the Reader screen opens it through `format-epub` over a connector/OPFS-backed
  `PublicationSource` and renders its first two-page spread

#### Scenario: Book bytes bypass the service worker

- **WHEN** the renderer reads book-byte ranges (`206` partial reads) to paginate
- **THEN** those reads are served directly from storage and are not intercepted by the service worker

### Requirement: Locator tracking and sync hand-off

The Reader screen SHALL subscribe to the navigator's `locatorChanged` event, keep the current locator
as the source for the position bar, and forward each emitted `Locator` to the sync engine
(`sync-engine`) keyed by `(sourceId, bookId, mediaType)`. The Reader screen SHALL NOT write progress
to a server directly. On open, the Reader screen SHALL navigate to a supplied initial locator when one
is available.

#### Scenario: Paging updates the current locator

- **WHEN** the user turns the page (chevron, key, or scrubber)
- **THEN** the navigator emits `locatorChanged` and the Reader screen's current locator updates to the
  new position
- **AND** the position bar reflects the updated locator

#### Scenario: Locator changes are handed to the sync engine

- **WHEN** `locatorChanged` fires
- **THEN** the Reader screen forwards the new `Locator`, keyed by `(sourceId, bookId, mediaType)`, to
  the sync engine's intake (owned by `sync-engine`)
- **AND** the Reader screen does not call the connector's progress write directly

#### Scenario: Reader restores to the initial locator on open

- **WHEN** the reader opens with a known initial locator for the book
- **THEN** the navigator goes to that locator before the first spread is presented to the reader

### Requirement: Untrusted book content is isolated from the app origin

The Reader screen SHALL render untrusted book content (EPUB HTML/JS) on a SEPARATE ORIGIN from the app —
inside a cross-origin `<iframe>` driven over an app↔frame postMessage bridge — so that book content runs
under a different security origin than the one holding the user's credentials (`edda.creds.*` in the app
origin's `localStorage`), and therefore physically cannot read them. This supersedes the earlier in-app
content sanitisation (ADR-012): with the renderer on a credential-free origin there is nothing reachable
to steal, regardless of the document's media type, root element, or active-content vector, so no
per-document parse-and-strip or CSP is required. The origin/serving model, the bridge command/event
protocol and its origin validation, the Transferable byte transfer (no in-frame network), and the
navigator-proxy lifecycle are specified by the `reader-isolation` capability.

> Reconciliation note: this requirement is SUPERSEDED (revised) by `add-reader-origin-isolation`
> (ADR-013, the `reader-isolation` capability). The original in-app parse-and-strip + per-document
> CSP (ADR-012) is removed; the wording above reflects the separate-origin guarantee so the two
> changes reconcile when this change archives.

#### Scenario: A crafted EPUB cannot exfiltrate credentials

- **WHEN** an EPUB whose spine document embeds a script that tries to reach the app origin's credentials
  (e.g. `window.top.localStorage.getItem('edda.creds.…')`), or an inline `on*` handler, is opened in the
  reader
- **THEN** the publication still renders its spread on the separate reader origin
- **AND** the browser's same-origin policy denies the cross-origin access — the app origin's
  `localStorage` is neither read nor written by the book, regardless of the script's root element or the
  document's media type

#### Scenario: A benign EPUB still renders on the reader origin

- **WHEN** a normal EPUB (e.g. one from `test-epubs/`) is opened in the reader
- **THEN** its pages render and paginate with images, styles, and embedded fonts intact inside the
  cross-origin reader frame
