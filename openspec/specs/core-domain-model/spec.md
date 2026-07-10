# Spec: Core Domain Model

## Purpose

The core domain model defines the platform-neutral, serializable shapes that every subsystem shares:
positions inside publications (`Locator`), normalized publication descriptors (`Publication`), book
identity and per-format progress keying (`BookRef`, `ProgressKey`), and the view-model a library card
renders (`LibraryBrowseEntry`, `ProgressSnapshot`). All types carry zero DOM and zero network
assumptions so the future native (Kotlin) client serializes the identical shape, guarded by
conformance tests. Sourced from change `add-library-browse`.

## Requirements

### Requirement: Readium-aligned Locator

The model SHALL define a `Locator` representing a position inside a publication, carrying a resource
`href`, a media `type`, an optional `title`, an optional `locations` object, and an optional `text`
snippet object. The `locations` object SHALL support `progression` (0..1 within the resource),
`totalProgression` (0..1 within the whole publication), `position` (a 1-based index where the format
supports it), `cfi` (an EPUB CFI), `page` (a 1-based PDF page), and `minutesLeft` (an estimated number
of minutes of reading remaining — a derived view-layer value the progress UI formats as "about 1h 12m
left"; carried on the locator so the estimate survives a round-trip). The `text` object SHALL support
`before`, `highlight`, and `after`. The top-level `Locator` SHALL carry optional sync-record metadata:
`lastReadAt` (ISO-8601 string, never a `Date`) and `lastReadDevice` (a human label such as "Phone");
these are stamped by the sync engine when a position is stored so the detail screen can show "Last read
2h ago on Phone". The `Locator` SHALL be the single unit the sync engine stores, and its type MUST carry
no DOM and no network types.

#### Scenario: Locator carries Readium locations

- **WHEN** a `Locator` is constructed for a position in an EPUB resource
- **THEN** it can carry `href`, `type`, `locations.progression`, `locations.totalProgression`, and
  `locations.cfi`
- **AND** no field requires a DOM node or a network/`fetch` type

#### Scenario: Locator expresses page- and position-based formats

- **WHEN** a `Locator` is constructed for a PDF page or a comic position
- **THEN** `locations.page` and/or `locations.position` express the location without requiring a `cfi`

#### Scenario: Locator carries an optional text snippet

- **WHEN** a `Locator` is built for a search hit or a bookmark
- **THEN** its `text` object exposes `before`, `highlight`, and `after` for display

#### Scenario: Locator carries sync-record metadata when stored

- **WHEN** the sync engine or local progress strategy stores a position
- **THEN** the resulting `Locator` carries `lastReadAt` (ISO-8601 string) and `lastReadDevice` (human
  label) at the top level — JSON-native values the native client serializes identically
- **AND** a freshly computed in-memory locator (not yet stored) carries neither field

#### Scenario: Locator locations carry a reading-time estimate

- **WHEN** a `Locator` has a `locations.minutesLeft` value
- **THEN** the progress UI formats it as a phrase such as "about 1h 12m left"
- **AND** when the field is absent the UI shows "just started" or no estimate

### Requirement: Readium-aligned Publication

The model SHALL define a `Publication` as the normalized output of a `FormatHandler`, carrying
`metadata` (at least `title`, with optional `author` and `language`), an ordered `readingOrder` of
`Locator`s (the spine), an optional `tableOfContents` of `Locator`s, and a `layout` discriminator.
`layout` MUST be exactly one of `reflowable`, `fixed`, `image-sequence`, or `mixed`. The `Publication`
type MUST carry no DOM and no network types.

#### Scenario: Publication exposes metadata and reading order

- **WHEN** a `FormatHandler` parses a book into a `Publication`
- **THEN** the result exposes `metadata.title` and an ordered `readingOrder`
- **AND** it may expose an optional `tableOfContents`

#### Scenario: Layout is a closed discriminator

- **WHEN** a `Publication` declares its `layout`
- **THEN** the value is exactly one of `reflowable`, `fixed`, `image-sequence`, or `mixed`
- **AND** a reflowable novel reports `reflowable` while a comic reports `image-sequence`

### Requirement: Book reference and per-format progress keying

The model SHALL define a `BookRef` identity carrying `sourceId`, `bookId`, `mediaType`, and `title`,
and SHALL key reading progress per `(sourceId, bookId, mediaType)` so the same title in two formats
holds two independent positions. A `ProgressKey` SHALL be derivable from any `BookRef`.

#### Scenario: BookRef identifies a book within a source

- **WHEN** a connector's browse yields a book
- **THEN** its `BookRef` carries `sourceId`, `bookId`, `mediaType`, and `title`

#### Scenario: Progress is keyed per format

- **WHEN** the same title exists as an EPUB and as a PDF
- **THEN** their derived `ProgressKey`s differ (the `mediaType` differs)
- **AND** each format retains its own independent `Locator`

### Requirement: Library browse entry

The model SHALL define a platform-neutral **library browse entry** that the Library renders, composing
a `BookRef` with the display data a card/cover needs: an optional `author`, an optional series/volume
label, a thumbnail **reference** (not embedded bytes), an optional progress snapshot (carrying
`totalProgression` and/or a `position`/`totalPositions` pair, plus optional `minutesLeft`,
`lastReadAt`, and `lastReadDevice` for the detail screen's "Last read … ago on …" line), a derived
format label, and a source label. Every field beyond the `BookRef` identity SHALL be optional or
derivable so entries from sources with sparse metadata still render. The entry type MUST carry no DOM
and no network types.

#### Scenario: Entry carries the card's display data

- **WHEN** the Library builds an entry for an in-progress book
- **THEN** the entry exposes the title, an author or series/volume label, a thumbnail reference, a
  progress snapshot, a format label, and a source label

#### Scenario: Format and source labels are derived

- **WHEN** an entry's `mediaType` is an EPUB, comic, or PDF media type
- **THEN** its format label resolves to `EPUB`, `CBZ`, or `PDF` respectively
- **AND** its source label is the human name/kind of its source (e.g. `komga`, `calibre`)

#### Scenario: Sparse metadata still renders

- **WHEN** a source supplies only identity and title (no author, no progress)
- **THEN** the entry remains valid and renderable with the optional fields absent

### Requirement: Versioned, platform-neutral JSON serialization

The model SHALL define a **versioned** JSON serialization for `Locator`, `Publication`, and the
`BookRef` / browse entry that round-trips identically (serialize → parse → serialize is stable and
deeply equal) and stamps an explicit schema version. The serialized form MUST contain only JSON-native
values — no DOM nodes, no `Date`, no functions, no platform handles — so a future native client reads
and writes the identical shape. Conformance tests SHALL assert round-trip stability and version
presence.

#### Scenario: Locator round-trips identically

- **WHEN** a `Locator` is serialized to JSON and parsed back
- **THEN** the parsed value is deeply equal to the original
- **AND** re-serializing the parsed value yields identical JSON

#### Scenario: Serialization is versioned

- **WHEN** any model value is serialized
- **THEN** the output carries an explicit schema-version field

#### Scenario: No platform-specific types cross the boundary

- **WHEN** a model value is serialized
- **THEN** the JSON contains only JSON-native values (no `Date`, function, DOM node, or network handle)
- **AND** a conformance test asserts the native client could read the identical shape

### Requirement: Book-detail metadata type (BookMeta)

The model SHALL define a platform-neutral `BookMeta` type returned by `Connector.getBook` for a given
`BookRef`. It SHALL carry: `title` (required), `authors` (required, an array — may be empty for sparse
sources), and optional fields: `year` (publication year integer), `language` (human-readable label),
`pageCount`, `genres` (array of label strings), `description`, `coverHref` (a URL reference — never
embedded bytes; absent ⇒ render the colour placeholder), `coverColor` (a CSS colour string for the
placeholder), `breadcrumb` (ordered location segments such as `["home server","fiction","austen"]`), and
`chapterCount` (the count a connector can report from catalog metadata before a FormatHandler opens the
book — the TOC rows themselves arrive via `Publication.toc`). Every field beyond `title`/`authors` is
optional so sparse sources (e.g. a plain OPDS feed) return a minimal `BookMeta` and the detail screen
simply omits the corresponding pills. The `BookMeta` type MUST carry no DOM and no network types.
`Connector.getBook` is REQUIRED on every `Connector` — a connector without rich catalog metadata returns
a minimal `{ title, authors: [] }` rather than leaving the method absent, mirroring the
`progressStrategy()` → `localOnlyStrategy` pattern for capability-gated features.

#### Scenario: Rich connector returns full BookMeta

- **WHEN** the Komga connector's `getBook` is called for a known book
- **THEN** it returns a `BookMeta` with at minimum `title`, `authors`, and whatever rich fields (year,
  language, page count, genres, description) Komga's catalog supplies
- **AND** the returned value carries no DOM or network types

#### Scenario: Sparse connector returns minimal BookMeta

- **WHEN** a connector with no rich catalog metadata (e.g. a plain OPDS connector) calls `getBook`
- **THEN** it returns at minimum `{ title: ref.title, authors: [] }` so the detail screen can render
  without crashing, omitting pills for facts it cannot supply

#### Scenario: Missing optional pills are omitted cleanly

- **WHEN** a `BookMeta` lacks an optional field (e.g. no language or no year)
- **THEN** the corresponding pill is absent from the detail screen's metadata row without a gap or
  placeholder

#### Scenario: Cover falls back to the colour placeholder

- **WHEN** `BookMeta.coverHref` is absent or its `<img>` fails to load
- **THEN** the detail screen renders the `coverColor` colour block (or a default) in place of the image

### Requirement: Reading preferences vocabulary

The model SHALL define a platform-neutral, serializable `ReadingPreferences` shape — the
reading-experience settings a `Navigator` applies (via `applyPreferences`) and a later capability
persists and syncs: an optional reading `theme` (exactly one of `light`, `sepia`, `dark`, `parchment`),
an optional `fontFamily`, an optional numeric `fontSize` (px), an optional numeric `lineHeight`, an
optional `scroll` flag (scrolled flow when true, paginated otherwise), and an optional `rtl` flag. Every
field SHALL be optional so a partial preference update is valid. The type MUST carry no DOM and no
network types so the native client re-expresses it identically; the web-only mapping of these values to
readium-css/foliate styles SHALL live in the format plugin, not in the model.

#### Scenario: ReadingPreferences is plain and serializable

- **WHEN** a `ReadingPreferences` value is constructed
- **THEN** it carries only JSON-native fields (`theme`, `fontFamily`, `fontSize`, `lineHeight`,
  `scroll`, `rtl`), each optional
- **AND** it survives a `structuredClone` / JSON round-trip unchanged and references no DOM or network
  type

#### Scenario: theme is a closed set

- **WHEN** a `ReadingPreferences.theme` is set
- **THEN** the value is exactly one of `light`, `sepia`, `dark`, or `parchment`

#### Scenario: Partial preferences are valid

- **WHEN** only a subset of fields is supplied (e.g. just `fontSize`)
- **THEN** the value is a valid `ReadingPreferences`
- **AND** the navigator applies only the supplied fields, leaving the rest unchanged
