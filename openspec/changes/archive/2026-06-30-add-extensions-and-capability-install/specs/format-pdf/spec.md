## ADDED Requirements

### Requirement: PDF format identity and install profile

The PDF format handler SHALL implement the `FormatHandler` contract with id `format.pdf`, and SHALL be
an **install-on-demand** (not bundled) first-party plugin. Its manifest SHALL declare version `v1.0.3`,
an approximate size of `1.2 MB`, media types `["application/pdf"]`, extensions `["pdf"]`, the `%PDF`
byte signature, layout `fixed`, locator scheme `page`, `search: true`, and **no network permission**.
These declared values SHALL match the install prompt and the AVAILABLE catalog row in the maket.

#### Scenario: Manifest matches the capability-missing card

- **WHEN** the PDF plugin's manifest is shown in the install prompt
- **THEN** it matches `doc/web/07-capability-missing-desktop.png`: `format.pdf · v1.0.3 · 1.2 MB`, the
  capability chips "Fixed layout"/"Search"/"Text selection", and the "No network access" /
  "Runs sandboxed" assurances

#### Scenario: Catalog row matches the Extensions screen

- **WHEN** the PDF plugin appears in the AVAILABLE catalog
- **THEN** it renders as `format.pdf · 1.2 MB` with a "NEXT UP" tag, matching
  `doc/web/06-extensions-desktop.png`

### Requirement: Sniff PDF resources

The PDF handler's `sniff(input)` SHALL return a high confidence when the input indicates PDF — media
type `application/pdf`, extension `pdf`, or head bytes beginning with the `%PDF` magic signature — and a
near-zero confidence otherwise.

#### Scenario: Magic bytes detected as PDF

- **WHEN** `sniff` receives head bytes beginning with `%PDF`
- **THEN** it returns a high confidence for PDF

#### Scenario: Non-PDF input rejected

- **WHEN** `sniff` receives an EPUB (`application/epub+zip`, `PK\x03\x04` head bytes)
- **THEN** it returns a near-zero confidence

### Requirement: Open a PDF into a Publication

The PDF handler's `open(source, host)` SHALL parse the PDF with pdfjs-dist into a `Publication` with
layout `fixed`, a `readingOrder` of its pages, and metadata (title and authors where present), deriving
a table of contents from the PDF outline when one exists. The imperative `Publication` and `Navigator`
objects SHALL be `markRaw()`'d so Vue reactivity never corrupts the renderer's internal state.

#### Scenario: A PDF opens as a fixed-layout publication

- **WHEN** "The Picture of Dorian Gray" PDF is opened after `format.pdf` is installed
- **THEN** the handler returns a `Publication` with `layout: 'fixed'`, a reading order of its pages, and
  its title in metadata
- **AND** the returned imperative objects are `markRaw()`'d

### Requirement: Page-based locators

The PDF navigator SHALL emit and accept `Locator`s using page positions — a 1-based `position` and an
optional coordinate `fragment` (e.g. `page=3&...`) — consistent with the `page` locator scheme.
`goTo(locator)` SHALL navigate to the locator's page, and `currentLocator()` SHALL report the current
page; a locator emitted on navigation SHALL round-trip back to the same page via `goTo`.

#### Scenario: Locator round-trips to its page

- **WHEN** the navigator reports a `currentLocator()` at page 42 and that locator is later passed to
  `goTo`
- **THEN** the navigator returns to page 42 (the `position` round-trips), honoring per-`mediaType`
  progress keying

### Requirement: Range streaming of PDF bytes

The PDF handler SHALL read bytes from the `PublicationSource` by range (OPFS `File.slice` for cached
files, or the connector's `openResource` for streaming) rather than requiring the whole file in memory,
and these book-byte reads SHALL bypass the Service Worker (`206` range reads are served directly).

#### Scenario: Partial range read without full download

- **WHEN** the PDF handler needs a byte range of an opened PDF
- **THEN** it reads only that range from the `PublicationSource` (a partial/`206`-style read), without
  loading the entire file and without routing the request through the Service Worker
