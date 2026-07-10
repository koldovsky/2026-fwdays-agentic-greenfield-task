# Spec: Format Handler - EPUB

## Purpose

The EPUB format handler is the client-side renderer for EPUB documents in Edda. It parses EPUB bytes
(via the vendored foliate-js engine) into a Readium-aligned `Publication`, adapts EPUB CFI locators
to platform-neutral `core/model` Locators, and exposes a `Navigator` for rendering over a mounted
element with support for preferences, navigation events, and plugin lifecycle management. Sourced
from change `add-format-epub`.

## Requirements

### Requirement: EPUB format capabilities and sniffing

The `format-epub` handler SHALL declare `FormatCapabilities` identifying it as the EPUB renderer: media
types MUST include `application/epub+zip`, extensions MUST include `epub`, `layout` MUST be
`reflowable`, `search` and `tts` MUST both be advertised as supported, and `locatorScheme` MUST be
`cfi`. The handler SHALL expose a stable plugin id (its `PluginManifest` id, e.g. `format.epub`) so the
registry can resolve and lazy-load it, and SHALL sniff input by media type, extension, and EPUB ZIP
head bytes. The neutral `core/contracts.FormatHandler` SHALL declare both `capabilities` (a
`FormatCapabilities`) and `sniff(input)` as contract members — they are platform-neutral (no DOM), so
the native client's format handlers declare and sniff identically.

#### Scenario: Capabilities identify the EPUB renderer

- **WHEN** the handler's declared `FormatCapabilities` are inspected
- **THEN** `mediaTypes` includes `application/epub+zip` and `extensions` includes `epub`
- **AND** `layout` is `reflowable`, `search` is true, `tts` is true, and `locatorScheme` is `cfi`

#### Scenario: Sniffing recognises EPUB input and rejects others

- **WHEN** the handler sniffs an input whose media type is `application/epub+zip`, whose file extension
  is `epub`, or whose head bytes are the EPUB ZIP signature
- **THEN** it returns a positive match confidence (claiming the format)
- **AND** a non-EPUB input (e.g. a `%PDF` document) returns no/low confidence

#### Scenario: Capabilities and sniff are neutral contract members

- **WHEN** the neutral `core/contracts.FormatHandler` type is inspected
- **THEN** it declares a `capabilities` field and a `sniff(input)` method
- **AND** neither references a DOM or web type, so the native client declares the identical surface

### Requirement: Parse EPUB bytes into a Readium-aligned Publication

The handler SHALL parse raw EPUB bytes **client-side** into a Readium-aligned `Publication` exposing
`metadata` (at least `title`; author and language when present in the EPUB), a `readingOrder`
reflecting the spine in document order, and a table of contents derived from the EPUB navigation
document or NCX. The neutral `core/contracts.FormatHandler` SHALL expose a single parse entry point —
`open(source: PublicationSource): Promise<Publication>` — and SHALL NOT expose a fully-buffered
`parse(bytes: Uint8Array)` method; a caller holding a complete byte array wraps it in an in-memory
`PublicationSource`. Parsing SHALL NOT perform any network request.

#### Scenario: Open the large light-novel EPUB

- **WHEN** the handler opens `test-epubs/The Eminence in Shadow - Volume 01 [Yen Press][Kobo].epub` from
  a `PublicationSource`
- **THEN** it returns a `Publication` whose `metadata.title` is `The Eminence in Shadow, Vol. 1` with a
  non-empty author (`Daisuke Aizawa and Touzai`) and language `en`
- **AND** `readingOrder` is non-empty and reflects the spine (dozens of entries)
- **AND** the table of contents is non-empty

#### Scenario: Open the small Pensées EPUB

- **WHEN** the handler opens `test-epubs/blaise-pascal_pensees.epub` from a `PublicationSource`
- **THEN** it returns a `Publication` whose `metadata.title` is `Pensées` and author is `Blaise Pascal`
- **AND** `readingOrder` is non-empty in spine order
- **AND** the table of contents (from the NCX) is non-empty

#### Scenario: Full-buffer callers wrap bytes in an in-memory source

- **WHEN** a caller holds a complete EPUB byte array and wants a `Publication`
- **THEN** it constructs an in-memory `PublicationSource` over those bytes and calls `open(source)`
- **AND** the neutral `FormatHandler` contract exposes no `parse(bytes)` method (one entry point only)

### Requirement: Read EPUB bytes from OPFS or a stream

The handler SHALL read EPUB bytes through a neutral `PublicationSource` — a platform-neutral,
random-access byte source exposing `size(): Promise<number>` and
`read(offset, length): Promise<Uint8Array>`, carrying no DOM/web types. An OPFS-cached file and a
fully-buffered byte array SHALL both be exposed as `PublicationSource`s supporting ranged reads; a
sequential stream (which cannot be range-read, since a ZIP's central directory is at the end of the
archive) SHALL be drained into an in-memory `PublicationSource` first. The handler SHALL read only the
ranges it needs rather than requiring the whole file to be buffered, and SHALL itself perform no network
I/O — the caller supplies the source. Web types (`File`/`Blob`/`ReadableStream`) SHALL remain inside
`platform/web` and the plugin; the neutral contract sees only `PublicationSource`.

#### Scenario: Parse identically from OPFS and from a stream

- **WHEN** the same EPUB is opened once from an OPFS-backed file `PublicationSource` and once from a
  source built by draining a sequential stream
- **THEN** both produce an equivalent `Publication` (same `metadata`, `readingOrder`, and table of
  contents)
- **AND** no network request is issued during parsing

#### Scenario: Large EPUB is read by range, not fully buffered

- **WHEN** the large light-novel EPUB is opened from an OPFS-backed file `PublicationSource`
- **THEN** the handler satisfies parsing via ranged `read(offset, length)` calls against that source
  rather than requiring the entire 14 MB file to be materialised in memory first

#### Scenario: PublicationSource is a neutral random-access type

- **WHEN** the `PublicationSource` contract type is inspected
- **THEN** it exposes `size()` and `read(offset, length)` and nothing else
- **AND** it references no DOM/web type (no `File`, `Blob`, or `ReadableStream` in its signature)

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

The web `format-epub` handler SHALL create a `Navigator` over a caller-supplied mounted `HTMLElement`
via `WebFormatHandler.createNavigator(publication, mount, options)` — a member of the `platform/web`
extension, NOT of the neutral `core/contracts.FormatHandler` (the `HTMLElement` mount is the single
web-bound member of the rendering surface). The neutral `Navigator` it returns SHALL implement, with no
DOM in any signature: `goTo(locator)`; `next()` and `prev()` (renderer-driven page/spread turns);
`seek(fraction)` (a 0..1 total-progression jump); `currentLocator()` (reflecting the position
established by the most recent navigation); `applyPreferences(preferences)` (font, size, theme, columns,
RTL); `on(event, callback)` for `locatorChanged` and `error` (each returning an unsubscribe); and
`destroy()` (tear down and release the engine). Initial-render completion SHALL be signalled by
resolution of the `createNavigator` promise — there SHALL be NO `loaded` event. The web-returned
`WebNavigator` MAY additionally expose `pageCount()` (a viewport-dependent page-total estimate) which is
NOT part of the neutral contract.

#### Scenario: currentLocator reflects the target after goTo (both fixtures)

- **WHEN** a `Navigator` is created over a mounted element for each parsed test EPUB (the large
  light-novel EPUB and the Pensées EPUB) and `goTo(target)` is called with a `Locator` in that
  publication
- **THEN** for each fixture `currentLocator()` returns a `Locator` resolving to the same position as
  `target`
- **AND** a `locatorChanged` event is emitted carrying that location

#### Scenario: Paging is renderer-driven via next/prev/seek

- **WHEN** `next()`, `prev()`, or `seek(fraction)` is called on the `Navigator`
- **THEN** the renderer turns to the next/previous page or spread, or jumps to the total-progression
  fraction (the reader does not compute page boundaries — the renderer owns pagination)
- **AND** a `locatorChanged` event carries the new position

#### Scenario: applyPreferences applies reading preferences

- **WHEN** `applyPreferences` is called with a changed font size or theme
- **THEN** the rendered content reflects the new preference (the layout re-flows) without re-creating
  the Navigator

#### Scenario: Event surface emits locatorChanged and error, and destroy tears down

- **WHEN** a publication finishes its initial render
- **THEN** the `createNavigator` promise resolves (there is no `loaded` event); a later failure during
  navigation fires an `error` event; subscribers can unsubscribe
- **AND** after `destroy()` the Navigator releases the engine and emits no further events

### Requirement: Neutral Navigator contract with a platform-specific factory

Every member of the neutral `core/contracts.Navigator` SHALL be platform-neutral — no DOM and no web
type in any signature — so the future native (Kotlin) client implements the identical surface and the
conformance tests guard it. The ONLY platform-specific parts of rendering SHALL be (a) the navigator
*factory* and (b) its *mount-target type*: the web platform exposes
`WebFormatHandler.createNavigator(pub, mount: HTMLElement, opts) → WebNavigator`, and a native platform
exposes its own factory taking a native view and returning a navigator implementing the same neutral
`Navigator`. `NavigatorOptions` (the parse `PublicationSource` plus an optional `ReadingPreferences`)
SHALL itself be neutral. The application SHALL consume the navigator through the neutral
`core/contracts.Navigator` (or the `platform/web` `WebNavigator`), never through the concrete
`@/plugins/formats/epub` class.

#### Scenario: Neutral Navigator carries no DOM

- **WHEN** the `core/contracts.Navigator` and `core/contracts.FormatHandler` types are inspected
- **THEN** no method signature references a DOM or web type
- **AND** the `HTMLElement` mount appears only on the `platform/web` `WebFormatHandler.createNavigator`
  factory

#### Scenario: App consumes the neutral/web navigator, not the plugin type

- **WHEN** the reader holds a live navigator for a book
- **THEN** it is typed against `core/contracts.Navigator` (or the `platform/web` `WebNavigator`), not
  the concrete `@/plugins/formats/epub/navigator` type
- **AND** the app module does not import the EPUB plugin's concrete navigator class

#### Scenario: Native client implements the same neutral surface

- **WHEN** a native platform provides a format handler
- **THEN** it implements the neutral `FormatHandler.open(source)`, `capabilities`, and `sniff`, and its
  factory returns a `Navigator` exposing the same neutral verbs (`goTo`/`next`/`prev`/`seek`/
  `currentLocator`/`applyPreferences`/`on`/`destroy`)
- **AND** it differs from the web platform only in the factory and the mount-target type

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
