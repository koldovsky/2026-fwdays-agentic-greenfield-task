## Purpose

Platform-neutral server-detection coordinator. Given a URL, the server prober asks every installed
connector's lightweight `probe()` function whether it recognizes the server, ranks the claims by
confidence (ties broken toward the more specialized connector), and maps the result to one of four
outcomes: `ready` (installed connector claimed it), `installable` (cataloged-but-not-installed
connector suggested), `unsupported` (reachable but unrecognized), or `unreachable` (no response).
The prober performs no direct network or DOM access; all I/O is delegated to connectors via the
injected `HostBridge`, making the logic re-expressible on the native client.

## Requirements

### Requirement: Confidence-ranked probing across installed connectors

Given a URL, the server prober SHALL ask every installed connector to `probe(url)` and SHALL select
the result with the highest confidence above a minimum threshold as the detected server. When more than
one connector claims the URL, the prober SHALL prefer the more specialized connector over a generic one
(a Komga server, which also speaks OPDS, SHALL be detected as Komga, not generic OPDS). The prober SHALL
NOT decide reachability or detection by connector ordering alone.

#### Scenario: Komga server is detected via the installed Komga connector

- **WHEN** the prober is given the URL of the throwaway Docker Komga (`test/komga`, reader account) with
  the `connector.komga` adapter installed
- **THEN** `connector.komga` returns the highest-confidence probe result
- **AND** the prober reports the detected kind as `komga` (not generic OPDS)

#### Scenario: Highest-confidence connector wins among several

- **WHEN** multiple installed connectors return probe results for the same URL with differing confidence
- **THEN** the prober selects the highest-confidence result above the threshold
- **AND** ties are broken toward the more specialized connector

### Requirement: Reachability determination is bounded

The prober SHALL determine whether a URL is reachable using a request bounded by a timeout, and SHALL
make that reachability outcome available before any credentials are supplied. The prober SHALL NOT hang
indefinitely and SHALL NOT throw an uncaught error on a network failure.

#### Scenario: A reachable server reports reachable

- **WHEN** the prober is given a reachable server URL
- **THEN** it reports the URL as reachable within the bounded timeout
- **AND** it does so without requiring credentials

#### Scenario: An unreachable URL resolves to an unreachable outcome

- **WHEN** the prober is given a URL that cannot be reached (DNS failure, connection refused, or the
  request exceeds the timeout)
- **THEN** the prober resolves to an `unreachable` outcome carrying a reason
- **AND** it neither hangs nor throws an uncaught error

### Requirement: Detected result carries kind and advertised capabilities

A successful detection SHALL include the detected server kind, the resolving connector's id, and the
connector's advertised capabilities (protocols, auth, progress sync, search, page streaming,
thumbnails), so a caller can present capabilities without first connecting or authenticating.

#### Scenario: Komga detection exposes its advertised capabilities

- **WHEN** the prober detects a Komga server
- **THEN** the result includes kind `komga`, connector id `connector.komga`, and advertised capabilities
  covering OPDS v2 + REST, progress sync, search, page streaming, and thumbnails

### Requirement: Catalog fallback to an installable suggestion

When no installed connector claims the URL above the threshold, the prober SHALL consult the available
(installable) plugin catalog and, when a cataloged-but-not-installed connector matches the server, SHALL
resolve to an `installable` outcome carrying that connector's manifest rather than failing.

#### Scenario: A known-but-not-installed connector is suggested

- **WHEN** the prober is given a URL whose server matches a connector present in the available catalog
  but not currently installed
- **THEN** the prober resolves to an `installable` outcome carrying the suggested connector's manifest
- **AND** no connector code is downloaded or executed merely to produce the suggestion

### Requirement: Generic OPDS connector is the always-available fallback

The prober SHALL resolve a URL that no specialized connector (installed or cataloged) claims but that
serves an OPDS feed via the generic OPDS connector (`connector.opds`, the always-available bundled
fallback owned by `add-extensions-and-capability-install`), reporting kind `opds` with the capabilities
the feed advertises (for example, progress sync only when OPDS v2 progression is present).

#### Scenario: A bare OPDS feed resolves via the generic connector

- **WHEN** the prober is given a bare OPDS feed URL that no specialized connector claims
- **THEN** the prober resolves it via `connector.opds` with detected kind `opds`
- **AND** the advertised capabilities reflect what the feed exposes (fewer than a Komga server)

### Requirement: Reachable but unrecognized URLs are unsupported

The prober SHALL resolve a reachable URL that is neither claimed by any connector (installed or
cataloged) nor a valid OPDS feed to an `unsupported` outcome carrying a reason, and that outcome SHALL
be distinct from the `unreachable` outcome.

#### Scenario: A reachable non-library URL is unsupported

- **WHEN** the prober is given a reachable URL that is not a known server kind and is not an OPDS feed
- **THEN** the prober resolves to an `unsupported` outcome with a reason
- **AND** that outcome is distinct from the `unreachable` outcome

### Requirement: Platform-neutral coordination through the HostBridge

The prober SHALL perform no direct network or DOM access; all I/O SHALL be delegated to connectors,
which use the `HostBridge`. The prober logic SHALL therefore be exercisable with a host bridge that uses
no web-only APIs, so the native client can re-express the same behavior (conformance).

#### Scenario: Prober runs without web-only APIs

- **WHEN** the prober runs against connectors backed by a host bridge whose `http` is a non-`fetch`,
  non-DOM stub
- **THEN** it produces the same reachability and detection outcomes
- **AND** the prober itself references no `window`, DOM, or direct `fetch`
