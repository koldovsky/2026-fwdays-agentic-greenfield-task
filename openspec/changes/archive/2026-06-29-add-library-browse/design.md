## Context

This change introduces Edda's **shared vocabulary** and its first content screen at once, because the
Library is what forces the model to exist. The model is the backbone of cross-platform reuse: the
future native (Kotlin) client shares **no UI or rendering code** with the web app — what it shares is
the **specification layer** (model + serialization + protocol semantics), held compatible by
conformance tests (`architecture.md` → Cross-platform reuse). So `core/model` and `core/contracts`
must carry **no DOM and no network types** (`CLAUDE.md` load-bearing invariant).

The model aligns to Readium (`DESIGN.md` §4–§5): a `Locator` (the position unit the sync engine
stores) and a `Publication` (the normalized output of a `FormatHandler`). Stubs already exist in
`src/core/model/index.ts` (`Locator`, `LocatorLocations`, `Publication`, `BookRef`, `ProgressKey`) and
`src/core/contracts/index.ts` (`Connector`, `ProgressSyncStrategy`, `FormatHandler`, `Navigator`); this
change extends them rather than re-inventing.

The Library screen is `doc/web/01-library-desktop.png` — the visual source of truth. Per the roadmap's
**fixture-connector-first** principle, the screen renders on an in-memory `Connector` so it is real and
unit-testable with no server; `add-connector-komga` (change 3) is another implementation of the same
interface and is swapped in, integration-tested against the Docker Komga in `test/komga/`.

## Goals / Non-Goals

**Goals:**
- A Readium-aligned, platform-neutral `Locator` + `Publication` with a `layout` discriminator.
- A `BookRef` identity with per-`(sourceId, bookId, mediaType)` progress keying, and a richer
  **library browse entry** the cards render (author, series/volume label, thumbnail ref, progress
  snapshot, derived format + source labels).
- A **versioned JSON serialization** that round-trips identically and contains only JSON-native values,
  guarded by conformance tests (the native-client compatibility guarantee).
- The Library home screen matching `doc/web/01-library-desktop.png`, rendering from a `Connector`.
- An in-memory **fixture connector** (same `Connector` interface) seeded to the maket, swappable for
  Komga in change 3.

**Non-Goals:**
- Any server, network, CORS, or HTTP code — that arrives with `host-bridge` / `connector-komga`
  (change 3). The `Connector.content()` byte path and `HostBridge` are out of scope here.
- Durable storage and live sync — the "downloaded for offline" count and "Synced 2m ago" pill are
  rendered from supplied values in this change; OPFS + Dexie outbox + furthest-progression-wins are
  owned by `add-offline-and-sync` (change 9).
- Book detail, the reader, and format parsing (foliate-js) — later changes. `Publication.readingOrder`
  is specified but not produced by a real `FormatHandler` here.
- Server-side / fuzzy search — search filters the loaded catalog locally; connector-driven search is a
  later capability.
- Reading typography (readium-css) — out of scope; chrome only (`add-reading-preferences`).

## Decisions

- **Align the model to Readium (`@readium/shared` shapes), not a bespoke model.** `Locator` and
  `Publication` mirror Readium so progress, TOC, bookmarks, and search behave the same across formats
  and platforms, and so `foliate-js` / Readium-Kotlin can both emit the same `Locator`. *Alternative:*
  a custom internal model — rejected; it forfeits ecosystem alignment and the native-reuse contract.
- **Typed `locations.cfi` and `locations.page`, not a generic `fragments[]`.** Following the existing
  stub (and this brief), `LocatorLocations` carries `progression`, `totalProgression`, `position`,
  `cfi` (EPUB CFI), and `page` (1-based PDF page) as named fields. *Alternative:* `DESIGN.md` §4's
  illustrative `fragments: string[]` — rejected here; named fields are clearer for the EPUB/PDF adapters
  and match the stub. (The serialization is versioned, so this can evolve compatibly.)
- **A `layout` discriminator on `Publication`** with the closed set `reflowable | fixed |
  image-sequence | mixed`, so the navigator and the library card (e.g. comic vs novel) can branch on it.
  *Alternative:* infer layout from media type at every call site — rejected; duplicative and lossy.
- **The library browse entry is a distinct view-model composing `BookRef`, not a fattened `BookRef`.**
  `BookRef` stays the minimal identity + progress key (the `Connector.browse()` contract return);
  the browse entry adds the display data a card needs (`author`, series/volume label, thumbnail ref,
  a progress snapshot, a derived format label, a source label). All non-identity fields are optional or
  derivable so sparse sources still render. *Alternative:* put display fields on `BookRef` — rejected;
  it couples the progress key / connector contract to presentation and bloats the wire identity.
- **Format and source labels are derived, and the readout phrase is formatted in the UI.** The model
  carries structured numbers (`totalProgression`, `position`/`totalPositions`); `library-browse`
  formats "38% · 1h 12m left", "page 88 / 192", "12% · just started" and maps media types to
  "EPUB"/"CBZ"/"PDF". *Alternative:* bake formatted strings into the model — rejected; formatting/i18n
  is presentation and would pollute the platform-neutral model.
- **Versioned JSON serialization with conformance round-trip tests.** A `serialize`/`parse` pair stamps
  an explicit `schemaVersion` and emits only JSON-native values; tests assert serialize→parse→serialize
  is stable and equal. This is the artifact the native client re-expresses. *Alternative:* rely on
  TypeScript structural types — rejected; TS types vanish at runtime and give the native client nothing
  to conform to.
- **Fixture-connector pattern: the Library depends only on the `Connector` interface.** An in-memory
  `FixtureConnector implements Connector` (`id`, `progressSync`, `probe`, `browse`, `content`,
  `progressStrategy`) supplies a catalog seeded to `doc/web/01-library-desktop.png`. The Library binds a
  `Connector` (later, several), never a concrete class. *Alternative:* mock the data store inside tests,
  or build the Library against Komga first — rejected; both couple the UI to specifics, prevent
  offline unit tests, and violate the fixture-first principle.
- **Local search over the loaded catalog.** Typing filters the in-memory entries by title/author with
  no round-trip. *Alternative:* defer search to the Komga change — rejected; the maket shows the box and
  a local filter is cheap, real, and testable now. Connector-backed search supersedes it later
  (gated by `ConnectorCapabilities.search`).

## Risks / Trade-offs

- [The rich browse entry assumes metadata a bare connector may not supply] → every field beyond the
  `BookRef` identity is optional/derivable; the card degrades gracefully (no author → omit the line,
  no progress → not a "Keep reading" card). `add-connector-komga` maps Komga metadata onto the same
  entry shape.
- [Serialization drifts between the web model now and the native client later] → an explicit
  `schemaVersion` plus round-trip conformance tests are the gate; a shape change without a version bump
  fails CI. The serialization is the contract, not the TS types.
- [The fixture catalog drifts from the maket] → the fixture is seeded to reproduce the exact books,
  labels, and readouts in `doc/web/01-library-desktop.png`, and a Playwright design-fidelity scenario
  checks the render against that PNG.
- [Showing progress / "Synced" / "downloaded" before a sync engine exists misleads] → these are
  fixture-supplied and read-only in this change; the keying is already `(sourceId, bookId, mediaType)`,
  so `add-offline-and-sync` (change 9) wires durable storage and live sync with no model rework.
- [`Connector.browse()` currently returns the minimal `BookRef[]`, but cards need richer entries] →
  the Library assembles each entry from the connector's browse result plus the progress snapshot and
  derived labels; the fixture (in-memory) carries the extra metadata it needs. The exact mapping of a
  real connector's browse output to the browse entry is reconciled in `add-connector-komga`.

## Open Questions

- The "time left" estimate ("1h 12m left") algorithm (WPM / position throughput) — deferred; the model
  carries `totalProgression`/`position` and the UI computes a phrase. Precise estimation belongs with
  `add-reader-navigation` / `add-reading-preferences`.
- Whether series/volume becomes a first-class structured field on the model or stays a display label —
  kept as a label for now; revisited when `add-connector-komga` exposes Komga's structured series data.
