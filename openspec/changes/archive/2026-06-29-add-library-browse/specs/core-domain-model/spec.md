## ADDED Requirements

### Requirement: Readium-aligned Locator

The model SHALL define a `Locator` representing a position inside a publication, carrying a resource
`href`, a media `type`, an optional `title`, an optional `locations` object, and an optional `text`
snippet object. The `locations` object SHALL support `progression` (0..1 within the resource),
`totalProgression` (0..1 within the whole publication), `position` (a 1-based index where the format
supports it), `cfi` (an EPUB CFI), and `page` (a 1-based PDF page). The `text` object SHALL support
`before`, `highlight`, and `after`. The `Locator` SHALL be the single unit the sync engine stores, and
its type MUST carry no DOM and no network types.

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
`totalProgression` and/or a `position`/`totalPositions` pair), a derived format label, and a source
label. Every field beyond the `BookRef` identity SHALL be optional or derivable so entries from sources
with sparse metadata still render. The entry type MUST carry no DOM and no network types.

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
