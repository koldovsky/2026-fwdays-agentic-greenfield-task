## ADDED Requirements

### Requirement: OPDS connector identity and always-on availability

The OPDS connector SHALL implement the `Connector` contract with id `connector.opds`, SHALL be a
bundled, always-available plugin, and SHALL declare honest capabilities: protocols `opds1` and `opds2`,
`download: true`, `search` per the feed's support, no paged streaming, and `progressSync` gated per
server (see "honest progress capability"). It SHALL be the generic fallback used when no specialised
connector claims a server. Its declared identity SHALL match the bundled OPDS row in the Extensions
screen.

#### Scenario: Identity matches the Extensions maket

- **WHEN** the OPDS connector is listed as an installed extension
- **THEN** its identity and role populate the bundled OPDS row in `doc/web/06-extensions-desktop.png`:
  `connector.opds · v1.4.0`, the chips "OPDS 1/2" and "Always-on fallback", tagged "BUNDLED"

### Requirement: Probe as the generic fallback

The OPDS connector's `probe(url)` SHALL recognise an OPDS catalog root (an OPDS 1 or 2 feed) and return
a positive but **low** confidence, so a specialised connector that recognises the same server (e.g.
`connector.komga`) wins resolution. When no specialised connector claims a server but it serves a valid
OPDS feed, resolution SHALL select `connector.opds`.

#### Scenario: A bare OPDS server resolves to the OPDS connector

- **WHEN** a server serving a generic OPDS feed is probed and no specialised connector claims it
- **THEN** `connector.opds` probes positive and resolution selects it as the connector

#### Scenario: A specialised connector outranks OPDS

- **WHEN** a Komga server is probed and both `connector.komga` and `connector.opds` probe positive
- **THEN** `connector.komga` wins on higher confidence and `connector.opds` yields

### Requirement: Browse via shared OPDS core

The OPDS connector SHALL browse a catalog by parsing OPDS navigation and acquisition feeds through the
shared `_opds-core` utilities (feed parsing, acquisition-link resolution). `listShelves` SHALL map
navigation feeds to shelves; `listBooks` and `search` SHALL map acquisition-feed entries to `BookRef`s,
carrying each entry's media type from its acquisition `<link type=...>` so the dispatcher can sniff it.

#### Scenario: Acquisition feed yields typed book references

- **WHEN** the connector lists books from an OPDS acquisition feed
- **THEN** each entry becomes a `BookRef` whose `mediaType` is taken from its acquisition link's `type`
  (e.g. `application/epub+zip`, `application/pdf`)

#### Scenario: Navigation feed yields shelves

- **WHEN** the connector lists shelves from an OPDS navigation feed
- **THEN** each navigation entry becomes a shelf the user can browse into

### Requirement: Download for offline

The OPDS connector SHALL resolve a book's acquisition link and return its bytes (a `ReadableStream` or
`Blob`) via `downloadBook`, suitable for the offline-storage layer to persist to OPFS. Book bytes SHALL
NOT be routed through the Service Worker.

#### Scenario: A book downloads from its acquisition link

- **WHEN** `downloadBook` is called for a book with a downloadable acquisition link
- **THEN** the connector returns the book's bytes for the offline-storage layer to write to OPFS,
  bypassing the Service Worker

### Requirement: Honest per-server progress capability

The OPDS connector SHALL set `progressSync: true` and provide `getProgress`/`setProgress` (mapping
OPDS v2 progression) **only when** the connected server advertises OPDS v2 progression. Otherwise it
SHALL set `progressSync: false` and omit the progress methods, so progress stays local-only and the
sync engine performs no server write-back for that source.

#### Scenario: Server advertises progression

- **WHEN** the connected OPDS v2 server advertises progression support
- **THEN** the connector reports `progressSync: true` and exposes `getProgress`/`setProgress` mapped to
  OPDS v2 progression

#### Scenario: Server without progression stays local-only

- **WHEN** the connected server (e.g. a Calibre OPDS feed) does not advertise progression
- **THEN** the connector reports `progressSync: false` and exposes no progress methods, and the sync
  engine keeps progress local-only for that source
