## ADDED Requirements

### Requirement: Identify a Komga server

The connector SHALL determine, from a base URL and without credentials, whether the URL is a Komga
server (e.g. via Komga's public claim endpoint), reporting a positive identification only for a Komga
server.

#### Scenario: Probe identifies the Docker test server

- **WHEN** the connector probes `http://localhost:25600` (the throwaway Docker Komga from `test/komga/`,
  provisioned via `pnpm komga:up` / `komga:provision`)
- **THEN** it identifies the URL as a Komga server
- **AND** it does so without supplying credentials

#### Scenario: Probe rejects a non-Komga URL

- **WHEN** the connector probes a URL that is not a Komga server
- **THEN** it does not identify the URL as Komga

### Requirement: Authenticate as a least-privilege reader

The connector SHALL authenticate to Komga using HTTP Basic with the configured account and operate with
only read privileges (file download + page streaming). Invalid credentials SHALL surface a clear
authentication error.

#### Scenario: Reader account authenticates and may browse

- **WHEN** the connector connects to the Docker test server with `reader@edda.test` / `edda-reader-pw`
- **THEN** an authenticated session is established over HTTP Basic
- **AND** the session can browse and fetch content using only the reader's `FILE_DOWNLOAD` +
  `PAGE_STREAMING` privileges

#### Scenario: Invalid credentials surface an authentication error

- **WHEN** the connector connects with wrong credentials
- **THEN** the attempt fails with a clear authentication error (the server's `401` mapped to a failure)

### Requirement: Browse libraries, series, and books

The connector SHALL browse the server hierarchically — libraries, then series within a library, then
books within a series — mapping each result to the shared domain types, with paging.

#### Scenario: Browsing the seeded library lists both EPUBs

- **WHEN** the connector browses the seeded "Test EPUBs" library on the Docker test server
- **THEN** it lists the two EPUBs seeded from `test-epubs/` as book references in the shared domain shape

#### Scenario: Listings are paged

- **WHEN** the connector lists series or books
- **THEN** the results are returned as pages (a page of results plus paging information)

### Requirement: Search

The connector SHALL search the server by term and return matching books as shared domain references.

#### Scenario: Search returns a matching seeded book

- **WHEN** the connector searches the Docker test server for a term present in a seeded EPUB's metadata
- **THEN** the matching book is returned among the results as a domain book reference

### Requirement: Fetch thumbnails

The connector SHALL fetch cover thumbnail images for books (and series), authenticated as the reader.

#### Scenario: Fetch a seeded book's thumbnail

- **WHEN** the connector fetches the thumbnail for a seeded book on the Docker test server
- **THEN** it returns the thumbnail image bytes

### Requirement: Open and download book content with ranges

The connector SHALL open book content for reading using HTTP range requests (partial `206` reads) and
SHALL download a whole book file for offline use. For paged/image-sequence books it SHALL stream
individual pages via Komga page streaming (PSE).

#### Scenario: Download a seeded EPUB whole and by range

- **WHEN** the connector downloads a seeded EPUB from the Docker test server
- **THEN** it returns the file's full bytes
- **AND** a range request for a byte slice returns just that slice as a `206` partial response

#### Scenario: Page streaming returns one page of a paged book

- **WHEN** the connector requests a single page of a paged/image-sequence book via page streaming
- **THEN** it returns that page's image

### Requirement: Declare capabilities honestly

The connector SHALL declare its capabilities truthfully: search, download, page streaming (PSE), and
thumbnails as supported, over the Komga REST protocol with HTTP Basic auth. It SHALL declare that the
server supports progress sync, while the progress read/write strategy itself is out of scope here and is
delivered by `progress-sync-strategy` (change 9).

#### Scenario: Capabilities reflect what is actually implemented

- **WHEN** the connector reports its capabilities
- **THEN** search, download, page streaming, and thumbnails are reported as supported, with the Komga
  REST protocol and HTTP Basic auth
- **AND** it declares that the server supports progress sync but performs no progress read or write in
  this change (that is owned by `progress-sync-strategy`, change 9)

### Requirement: Compose `_opds-core`, not inherit

Where Komga exposes OPDS/Readium representations, the connector SHALL reuse the shared `_opds-core`
utilities (feed/manifest parsing, acquisition-link resolution, progression mapping) by composition,
using native Komga REST where it is richer (paging, search, page streaming, thumbnails). The connector
SHALL NOT subclass an OPDS connector.

#### Scenario: Shared OPDS mapping is reused by composition

- **WHEN** the connector maps a Komga OPDS/Readium publication to the shared domain types
- **THEN** it does so by reusing the `_opds-core` mapping utilities
- **AND** it does so without subclassing an OPDS connector (no inheritance chain)

### Requirement: Integration-tested against a real Komga server

The connector's probe, authentication, browse, and content behaviour SHALL be integration-tested against
the throwaway Docker Komga in `test/komga/`, authenticated as the reader account, with the library
seeded from `test-epubs/`. The Komga-dependent tests SHALL be gated on the server being provisioned
(`pnpm komga:provision`) and SHALL skip or fail clearly when it is unavailable rather than passing
silently.

#### Scenario: Integration suite exercises the provisioned server

- **WHEN** the Docker Komga is provisioned (`pnpm komga:up` / `pnpm komga:provision`) and the integration
  suite runs
- **THEN** it probes `http://localhost:25600`, authenticates as `reader@edda.test`, and browses the two
  EPUBs seeded from `test-epubs/`

#### Scenario: Missing test server does not pass silently

- **WHEN** the Komga integration tests run without a provisioned server
- **THEN** they are clearly skipped or failed (never silently reported as passing)
