## ADDED Requirements

### Requirement: EPUB format capabilities and sniffing

The `format-epub` handler SHALL declare `FormatCapabilities` identifying it as the EPUB renderer: media
types MUST include `application/epub+zip`, extensions MUST include `epub`, `layout` MUST be
`reflowable`, `search` and `tts` MUST both be advertised as supported, and `locatorScheme` MUST be
`cfi`. The handler SHALL expose a stable plugin id (its `PluginManifest` id, e.g. `format.epub`) so the
registry can resolve and lazy-load it, and SHALL sniff input by media type, extension, and EPUB ZIP
head bytes.

#### Scenario: Capabilities identify the EPUB renderer

- **WHEN** the handler's declared `FormatCapabilities` are inspected
- **THEN** `mediaTypes` includes `application/epub+zip` and `extensions` includes `epub`
- **AND** `layout` is `reflowable`, `search` is true, `tts` is true, and `locatorScheme` is `cfi`

#### Scenario: Sniffing recognises EPUB input and rejects others

- **WHEN** the handler sniffs an input whose media type is `application/epub+zip`, whose file extension
  is `epub`, or whose head bytes are the EPUB ZIP signature
- **THEN** it returns a positive match confidence (claiming the format)
- **AND** a non-EPUB input (e.g. a `%PDF` document) returns no/low confidence

### Requirement: Parse EPUB bytes into a Readium-aligned Publication

The handler SHALL parse raw EPUB bytes **client-side** into a Readium-aligned `Publication` exposing
`metadata` (at least `title`; author and language when present in the EPUB), a `readingOrder`
reflecting the spine in document order, and a table of contents derived from the EPUB navigation
document or NCX. Parsing SHALL NOT perform any network request.

#### Scenario: Parse the large light-novel EPUB

- **WHEN** the handler parses `test-epubs/The Eminence in Shadow - Volume 01 [Yen Press][Kobo].epub`
- **THEN** it returns a `Publication` whose `metadata.title` is `The Eminence in Shadow, Vol. 1` with a
  non-empty author (`Daisuke Aizawa and Touzai`) and language `en`
- **AND** `readingOrder` is non-empty and reflects the spine (dozens of entries)
- **AND** the table of contents is non-empty

#### Scenario: Parse the small Pensées EPUB

- **WHEN** the handler parses `test-epubs/blaise-pascal_pensees.epub`
- **THEN** it returns a `Publication` whose `metadata.title` is `Pensées` and author is `Blaise Pascal`
- **AND** `readingOrder` is non-empty in spine order
- **AND** the table of contents (from the NCX) is non-empty

### Requirement: Read EPUB bytes from OPFS or a stream

The handler SHALL accept a bytes source that is either an OPFS-cached file supporting range reads or a
sequential byte stream, and SHALL parse identically from both. It SHALL read only the ranges it needs
rather than requiring the whole file to be buffered, and SHALL itself perform no network I/O — the
caller supplies the bytes.

#### Scenario: Parse identically from OPFS and from a stream

- **WHEN** the same EPUB is opened once from an OPFS-backed file source and once from a sequential
  stream source
- **THEN** both produce an equivalent `Publication` (same `metadata`, `readingOrder`, and table of
  contents)
- **AND** no network request is issued during parsing

#### Scenario: Large EPUB is read by range, not fully buffered

- **WHEN** the large light-novel EPUB is opened from an OPFS-backed file source
- **THEN** the handler satisfies parsing via ranged reads against that source rather than requiring the
  entire 14 MB file to be materialised in memory first

### Requirement: Lazy-load the vendored foliate-js engine

The handler SHALL load the vendored foliate-js engine via a native dynamic `import()` of a code-split
chunk on first use, not at module-evaluation time, so the engine is excluded from the initial bundle
and the plugin is asynchronous from day one. The engine SHALL be the vendored copy under
`vendor/foliate-js` (a pinned git submodule), referenced by relative path — not downloaded at runtime.

#### Scenario: Engine chunk loads on first open

- **WHEN** the `format-epub` module is imported but no EPUB has been opened yet
- **THEN** the foliate-js engine has not been loaded (it is not in the module's static import graph)
- **AND** the first `open`/parse call triggers a dynamic `import()` that loads the engine chunk

#### Scenario: Engine is the vendored submodule, not remote code

- **WHEN** the dynamic `import()` resolves
- **THEN** it resolves to the in-tree `vendor/foliate-js` submodule by relative path
- **AND** no code is fetched from a remote/network source to "install" the format

### Requirement: CFI ↔ Locator adapter round-trips

The adapter SHALL map foliate's EPUB CFIs and DOM `Range`s to and from the platform-neutral `core/model`
`Locator`, carrying the CFI in the Locator's `locations` (its CFI field), and SHALL round-trip stably:
converting a CFI to a `Locator` and back MUST yield the original CFI, and a DOM `Range` mapped to a
`Locator` and back MUST resolve to the same selection. The adapter MAY use `@readium/shared` internally
but SHALL emit plain, serializable `core/model` Locators so `core/model` carries no web runtime types.

#### Scenario: CFI round-trips for the large EPUB

- **WHEN** a CFI taken from `The Eminence in Shadow, Vol. 1` is converted to a `Locator` and then back
  to a CFI
- **THEN** the resulting CFI equals the original
- **AND** the intermediate `Locator` carries that CFI in its `locations` and has `type`
  `application/epub+zip`

#### Scenario: CFI round-trips for the Pensées EPUB

- **WHEN** a CFI taken from `Pensées` is converted to a `Locator` and then back to a CFI
- **THEN** the resulting CFI equals the original

#### Scenario: Emitted Locator is plain and serializable

- **WHEN** the adapter produces a `Locator`
- **THEN** it is a plain `core/model` object that survives `structuredClone`/JSON round-trip unchanged
- **AND** it is not a `@readium/shared` class instance (no web runtime type leaks into `core/model`)

### Requirement: EPUB Navigator over a mounted element

The handler SHALL create a `Navigator` over a caller-supplied mounted `HTMLElement`. The `Navigator`
SHALL implement `goTo(locator)` and `currentLocation()`, where `currentLocation()` reflects the
position established by the most recent `goTo`. It SHALL implement `applyPreferences(preferences)` to
apply reading preferences (font, size, theme, columns, RTL) to the rendered content, expose an event
surface for `loaded`, `locatorChanged`, and `error` (with an unsubscribe), and provide `destroy()` to
tear down and release the engine.

#### Scenario: currentLocation reflects the target after goTo (both fixtures)

- **WHEN** a `Navigator` is created over a mounted element for each parsed test EPUB (the large
  light-novel EPUB and the Pensées EPUB) and `goTo(target)` is called with a `Locator` in that
  publication
- **THEN** for each fixture `currentLocation()` returns a `Locator` resolving to the same position as
  `target`
- **AND** a `locatorChanged` event is emitted carrying that location

#### Scenario: applyPreferences applies reading preferences

- **WHEN** `applyPreferences` is called with a changed font size or theme
- **THEN** the rendered content reflects the new preference (the layout re-flows) without re-creating
  the Navigator

#### Scenario: Event surface emits loaded and error, and destroy tears down

- **WHEN** a publication finishes its initial render
- **THEN** a `loaded` event fires; a failure during navigation fires an `error` event; subscribers can
  unsubscribe
- **AND** after `destroy()` the Navigator releases the engine and emits no further events

### Requirement: Renderer objects are a markRaw() boundary

The `Publication` and `Navigator` returned by the handler SHALL be plain, framework-neutral imperative
objects holding foliate-js internal state; the `format-epub` package SHALL NOT import any UI-framework
reactivity. The contract SHALL document that consumers MUST `markRaw()` these objects before storing
them in reactive state so Vue reactivity never proxies and corrupts the engine's internals (ADR-001).
The same rule applies to connector `Session`s (owned by the connector capabilities).

#### Scenario: Returned objects are non-reactive and framework-neutral

- **WHEN** the handler returns a `Publication` and a `Navigator`
- **THEN** they are plain instances, not Vue reactive proxies (`isReactive` is false)
- **AND** the `format-epub` package imports no UI-framework reactivity, so `markRaw()` responsibility
  sits with the consumer, as documented on the contract
