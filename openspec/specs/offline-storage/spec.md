# Spec: Offline Storage

## Purpose

Offline storage gives Edda users the ability to download books to the device and read them with no
network connection. Book bytes are streamed into OPFS (Origin Private File System) via a dedicated
Web Worker using `FileSystemSyncAccessHandle`, then served back by range-reads using `File.slice`
without passing through the Service Worker (ADR-005). A Dexie 4 database holds the download registry
and the progress outbox; both are keyed per `(sourceId, bookId, mediaType)`. A credentialed download
is origin-gated: if the book's resolved URL falls outside the connector's declared-network allowlist,
the download is refused before `fetch` runs, preventing credential laundering to a foreign origin
(the ch7 reader-isolation precedent applied to the download path). Sourced from change
`add-offline-and-sync`.

## Requirements

### Requirement: Stream a book download to OPFS

When a user downloads a book, the app SHALL stream its bytes into a file in OPFS as they arrive, without
buffering the entire publication in memory, and SHALL record the book in the download registry as
offline-available only once the download completes successfully. An interrupted download SHALL NOT leave a
completed registry entry, and its partial bytes SHALL NOT be served as a complete book.

#### Scenario: Download streams to OPFS and registers on completion

- **WHEN** a book download runs to completion
- **THEN** its bytes are written to an OPFS file as a stream (not held wholly in memory)
- **AND** the book appears in the download registry marked offline-available

#### Scenario: Interrupted download does not register as complete

- **WHEN** a download is interrupted before completion
- **THEN** no completed registry entry exists for that book
- **AND** the partial OPFS file is cleaned up or marked incomplete so it is not served as a full book

### Requirement: Range reads from offline storage

For a downloaded book, the app SHALL serve arbitrary byte-range reads from its OPFS file via `File.slice`, so the
format handler reads resources on demand without loading the whole file. Hot writes to OPFS SHALL use a
`FileSystemSyncAccessHandle` executed inside a Web Worker and SHALL NOT run on the main thread.

#### Scenario: Range read returns the requested slice

- **WHEN** the reader requests a byte range of a downloaded book
- **THEN** the corresponding `File.slice` is returned from OPFS without reading the whole file

#### Scenario: Hot writes run in a Worker

- **WHEN** bytes are written to OPFS during a download
- **THEN** the write uses a `FileSystemSyncAccessHandle` running in a Web Worker, not on the main thread

### Requirement: Book bytes bypass the Service Worker

Book-byte range reads SHALL be served directly from OPFS and SHALL NOT be routed through the Service Worker; the
`206` partial-read path MUST bypass Workbox (ADR-005). This relies on the byte-route denylist installed by
`app-shell` in `sw.ts`.

#### Scenario: A 206 range read bypasses the Service Worker

- **WHEN** a book-byte range (`206`) read is performed
- **THEN** it is served directly from OPFS storage
- **AND** the request is not intercepted or cached by the Service Worker / Workbox

### Requirement: Durable download registry

The app SHALL persist a download registry in Dexie 4 with typed tables and versioned migrations. Each entry SHALL
be keyed per `(sourceId, bookId, mediaType)` and SHALL record at least the byte size, the download state, and a
downloaded-at timestamp. The registry SHALL survive reloads. Because progress is keyed per
`(sourceId, bookId, mediaType)`, the EPUB and the PDF of the same title SHALL be distinct registry entries.

#### Scenario: Registry persists across reloads

- **WHEN** a book has been downloaded and the app is reloaded
- **THEN** the registry still lists the book as offline-available with its size and downloaded-at time

#### Scenario: Same title in two formats are separate entries

- **WHEN** the same title is downloaded as both EPUB and PDF
- **THEN** the registry holds two distinct entries keyed by their differing `mediaType`

### Requirement: Downloads list, badge, offline count, and offline-available indicator

The app SHALL provide a Downloads list of offline-available books, SHALL drive the sidebar Downloads badge with
the count of downloaded books, SHALL contribute the "N downloaded for offline" count shown in the library
header, and SHALL mark each offline-available book with an indicator. Downloading a book SHALL add it to the
Downloads list and increment these counts; removing a download SHALL decrement them and free its OPFS bytes.
These surfaces SHALL match `doc/web/01-library-desktop.png`.

#### Scenario: Downloading increments the Downloads badge and list

- **WHEN** a book finishes downloading
- **THEN** it appears in the Downloads list
- **AND** the sidebar Downloads badge count increments, matching the badged "Downloads" item in
  `doc/web/01-library-desktop.png`

#### Scenario: Library shows the downloaded-for-offline count

- **WHEN** the library header renders with downloaded books present
- **THEN** it shows an "N downloaded for offline" count consistent with the registry, matching the
  "14 downloaded for offline" subtitle in `doc/web/01-library-desktop.png`

#### Scenario: Offline-available books are indicated

- **WHEN** a book is offline-available
- **THEN** it is shown with an offline-available indicator wherever it is listed (the Downloads list and the
  library)

#### Scenario: Removing a download decrements the counts and frees bytes

- **WHEN** a downloaded book is removed from Downloads
- **THEN** the Downloads badge and the "downloaded for offline" count both decrement
- **AND** its OPFS bytes are released

### Requirement: Read a downloaded book fully offline

A downloaded book SHALL open and be readable end-to-end with the network unavailable: every resource the reader
needs SHALL resolve from OPFS, and no network request SHALL be required to page through the book.

#### Scenario: Read to the end with the network cut

- **WHEN** the network is cut and a downloaded book is opened
- **THEN** the book opens and can be paged from start to end with all resources served from OPFS
- **AND** no network request is required to read it

### Requirement: Credentialed download is origin-gated

A streamed download that carries the connector's credentials (e.g. an `Authorization` header) SHALL be refused
before `fetch` runs if the resolved download URL's origin is not in the connector's declared-network allowlist.
This prevents a malicious or compromised server manifest from redirecting the reader's credentials to a foreign
origin. Additionally, the download SHALL use `redirect: 'error'` as defense-in-depth so a 3xx response cannot
transparently carry credentials past the origin gate.

#### Scenario: Cross-origin download URL is rejected before fetch

- **WHEN** the connector's download descriptor resolves to a URL whose origin is not in `allowedOrigins`
- **THEN** the download is refused with an error before any `fetch` is made
- **AND** no credentials are sent to the foreign origin

#### Scenario: Redirect to a foreign origin is blocked

- **WHEN** the credentialed download `fetch` receives a 3xx redirect to an origin outside the allowlist
- **THEN** the redirect is not followed and the download fails
- **AND** credentials are not sent to the redirect target
