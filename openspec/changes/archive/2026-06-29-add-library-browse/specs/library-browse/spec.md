## ADDED Requirements

### Requirement: Library header and catalog summary

The Library screen SHALL render a serif display heading "Your library" and, directly beneath it, a
single counts line summarizing the catalog as "<N> titles · <M> sources · <K> downloaded for offline".
The heading and counts line SHALL match `doc/web/01-library-desktop.png`. The downloaded-for-offline
figure is supplied to the Library in this change (durable offline storage and live sync are owned by
`add-offline-and-sync`).

#### Scenario: Header and counts match the maket

- **WHEN** the Library renders
- **THEN** it shows the "Your library" heading with the counts line "342 titles · 3 sources · 14
  downloaded for offline" beneath it, positioned as in `doc/web/01-library-desktop.png`

#### Scenario: Counts reflect the catalog

- **WHEN** the bound connector's catalog has T titles, the app has S connected sources, and D offline
  downloads
- **THEN** the counts line reads "T titles · S sources · D downloaded for offline"

### Requirement: Search box with local filtering

The Library SHALL present a search input with the placeholder "Search titles, authors…" in the header
region, matching `doc/web/01-library-desktop.png`. Typing a query SHALL filter the rendered catalog
locally — client-side over the already-loaded entries, by title and author — with no network request in
this change.

#### Scenario: Search box matches the maket

- **WHEN** the Library renders
- **THEN** a search input with the placeholder "Search titles, authors…" appears in the header, as in
  `doc/web/01-library-desktop.png`

#### Scenario: Local filter narrows the catalog

- **WHEN** the user types a term that matches some titles or authors
- **THEN** only the matching entries remain visible
- **AND** no network request is made (filtering is local)

#### Scenario: Clearing the query restores the catalog

- **WHEN** the user clears the search query
- **THEN** the full catalog is shown again

### Requirement: Sync status pill

The Library header SHALL show a "Synced <relative-time> ago" pill (e.g. "Synced 2m ago") indicating
when the catalog/progress last synced, matching `doc/web/01-library-desktop.png`. In this change the
last-sync time is supplied to the Library; the live sync engine is owned by `add-offline-and-sync`.

#### Scenario: Sync pill matches the maket

- **WHEN** the Library renders with a supplied last-sync time of two minutes ago
- **THEN** a pill reads "Synced 2m ago" in the header, as in `doc/web/01-library-desktop.png`

#### Scenario: Pill reflects the supplied sync time

- **WHEN** the supplied last-sync time is N minutes ago
- **THEN** the pill reads "Synced Nm ago"

### Requirement: Keep reading row

The Library SHALL render a "Keep reading" section with a "See all" affordance and a horizontal row of
in-progress book cards. Each card SHALL show a cover, the title, an author line OR a series/volume line,
a progress readout, a "<FORMAT> · <source>" chip pair, and a progress bar reflecting the same fraction.
Progress readouts SHALL render in the maket's forms: a percent-with-phrase ("38% · 1h 12m left", "12% ·
just started") for percent-tracked formats, and a page form ("page 88 / 192") for page-tracked formats.

#### Scenario: Keep reading row matches the maket

- **WHEN** the Library renders
- **THEN** a "Keep reading" header with a "See all" link sits above a row of cards reproducing
  `doc/web/01-library-desktop.png`: Pride and Prejudice (Jane Austen, "38% · 1h 12m left", chip "EPUB ·
  komga"), Saltmoon ("Vol. 4 · R. Okonkwo", "page 88 / 192", chip "CBZ · komga"), and Dorian Gray
  (Oscar Wilde, "12% · just started", chip "PDF · calibre")

#### Scenario: Card shows an author or a volume line

- **WHEN** a card's entry carries a series/volume label
- **THEN** the card shows the volume line (e.g. "Vol. 4 · R. Okonkwo") in place of a plain author line

#### Scenario: Progress readout form follows the format

- **WHEN** a card's progress is page-tracked
- **THEN** the readout reads "page <position> / <total>" (e.g. "page 88 / 192")
- **AND** when the progress is percent-tracked the readout reads "<percent>% · <phrase>" and the
  progress bar reflects the same fraction

#### Scenario: Chips show format and source

- **WHEN** a card renders
- **THEN** it shows a "<FORMAT> · <source>" chip pair derived from the entry (e.g. "EPUB · komga",
  "CBZ · komga", or "PDF · calibre")

### Requirement: Recently added grid

The Library SHALL render a "Recently added" section as a grid of book covers. Each cover SHALL carry a
format badge (one of EPUB / CBZ / PDF) and a spine author/volume label, with the title and author
rendered beneath the cover. The section SHALL match `doc/web/01-library-desktop.png`.

#### Scenario: Recently added grid matches the maket

- **WHEN** the Library renders
- **THEN** a "Recently added" grid shows covers for Frankenstein (EPUB, "Mary Shelley"), Moby-Dick
  (EPUB, "Herman Melville"), Dracula (EPUB, "Bram Stoker"), The Tin Forest (CBZ, "Vol. 1 · A. Voss"),
  Great Expectations (EPUB, "Charles Dickens"), and Jane Eyre (EPUB, "Charlotte Brontë"), each with a
  format badge and the title/author beneath, as in `doc/web/01-library-desktop.png`

#### Scenario: Cover carries a format badge

- **WHEN** a recently-added cover renders
- **THEN** a format badge reading EPUB, CBZ, or PDF appears on the cover, matching the entry's format

### Requirement: Grid/list toggle

The Library SHALL provide a grid/list segmented toggle for the "Recently added" section, defaulting to
grid as shown in the maket. Switching to list SHALL re-present the same entries as a list without losing
or reordering them; switching back SHALL restore the grid.

#### Scenario: Toggle matches the maket and defaults to grid

- **WHEN** the Library renders
- **THEN** a grid/list toggle appears at the "Recently added" section header with grid selected, as in
  `doc/web/01-library-desktop.png`

#### Scenario: Switching presentation preserves entries

- **WHEN** the user activates the list option
- **THEN** the same recently-added entries render as a list
- **AND** switching back to grid restores the grid with the same entries in the same order

### Requirement: Renders from a Connector via an in-memory fixture

The Library SHALL obtain its catalog by calling a `Connector` from `core/contracts` (its `browse()`
result) and SHALL depend only on that interface, so any `Connector` implementation is interchangeable.
In this change the bound connector SHALL be an in-memory fixture implementing the existing `Connector`
interface (no server), making the screen real and unit-testable; the Komga REST connector is
substituted in `add-connector-komga` with no Library changes. Each rendered entry SHALL be assembled
from the connector's browse result, the per-`(sourceId, bookId, mediaType)` progress snapshot, and the
derived source/format labels.

#### Scenario: Library renders from the fixture connector

- **WHEN** the Library mounts with the in-memory fixture `Connector` bound
- **THEN** it renders the "Keep reading" and "Recently added" sections from the fixture catalog
- **AND** no network request is made

#### Scenario: The connector is interchangeable

- **WHEN** a different `Connector` implementation is bound (e.g. the Komga connector in a later change)
- **THEN** the Library renders that connector's catalog with no code changes to the Library

#### Scenario: Entries assembled with per-format progress

- **WHEN** the Library builds an entry
- **THEN** its progress is looked up by the `(sourceId, bookId, mediaType)` key
- **AND** its format and source labels are derived from the `mediaType` and the source

### Requirement: Library screen composition

The Library SHALL compose its regions top-to-bottom as in `doc/web/01-library-desktop.png`: the "Your
library" heading with the counts line on the left and the search box plus sync pill on the right; then
the "Keep reading" row; then the "Recently added" grid with its grid/list toggle. The screen SHALL
render on the app shell's parchment canvas beside the sidebar (the sidebar nav and Sources region are
owned by `app-shell`).

#### Scenario: Region order matches the maket

- **WHEN** the Library renders
- **THEN** the heading/counts (left) with the search box and sync pill (right) sit at the top, above the
  "Keep reading" row, which sits above the "Recently added" grid, reproducing the composition of
  `doc/web/01-library-desktop.png`

#### Scenario: Library renders inside the app shell

- **WHEN** the Library route is active
- **THEN** its content occupies the main region on the parchment canvas to the right of the `app-shell`
  sidebar (the Library does not re-draw the sidebar)
