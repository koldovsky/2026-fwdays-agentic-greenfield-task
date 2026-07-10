## Context

Three sources disagree on the Format/Navigator contract:

- **`DESIGN.md` §5.2** (cited by `index.ts`, `web-format-handler.ts`, `add-reader-navigation/design.md`)
  declares a *neutral* `Navigator` and a `FormatHandler.createNavigator(pub, mount: HTMLElement, opts)`.
  Putting `HTMLElement` in the neutral interface **violates the load-bearing rule** that
  `core/contracts` carries no DOM (CLAUDE.md, `architecture.md:98`, the `host-bridge` spec). It is also
  too thin (no `next`/`prev`/`seek`) and drops nothing onto a platform layer.
- **`src/core/contracts/index.ts`** (what shipped) is thinner still: `FormatHandler = { id, mediaTypes,
  parse(bytes) }` and `Navigator = { goTo, currentLocation }`. `parse(bytes: Uint8Array)` forces full
  buffering — the opposite of ADR-005's ranged zip reads (the 14 MB light-novel is never fully buffered).
- **The implementation** silently chose a third design: the rich surface (`open`, `createNavigator`,
  `capabilities`, `sniff`, `next`/`prev`/`seek`/`applyPreferences`/`on`/`destroy`/`pageCount`) lives on
  the concrete `EpubFormatHandler`/`EpubNavigator` and on `platform/web`'s `WebFormatHandler`. The
  reader (`useNavigator.ts:19`) imports the concrete `@/plugins/formats/epub/navigator` type — the app
  is coupled to the EPUB plugin.

The consequence that matters: the architecture's whole premise is that `core/contracts` is "the prose
the native client re-expresses," guarded by conformance tests. Today the native client has **no
conformance target** for paging, preferences, the locator stream, or lifecycle, because they live on a
web concrete class. The grep evidence says this is the cheap moment to fix it: `on('loaded')`/`on('error')`
have **zero** subscribers, `currentLocation()` is 3 sites, `ReadingPreferences` has **zero** references
outside the plugin, and downstream changes 8 (`reading-preferences`) and 9 (`offline-and-sync`) — which
will call `applyPreferences` and consume `on('locatorChanged')` — have not landed.

## Goals / Non-Goals

**Goals:**

- One coherent contract across `DESIGN.md` §5.2, `core/contracts`, and the implementation.
- A neutral `Navigator`/`FormatHandler` rich enough to be the native client's conformance target, with
  **the single web-bound member** (the navigator factory + its `HTMLElement` mount) isolated in
  `platform/web`.
- Ranged reads (ADR-005) expressible *in the neutral contract* via a `PublicationSource`, so `parse(bytes)`
  full-buffering stops being the contract's only door.
- Remove the `app → @/plugins/formats/epub` coupling (retype the reader to neutral/web types).

**Non-Goals:**

- The reading-preferences panel / persistence (change 8) — this only moves the `ReadingPreferences`
  *type* and the `applyPreferences` *contract member*; it does not build the panel or store values.
- The sync engine / outbox (change 9) — this keeps the locator stream (`on('locatorChanged')`); it does
  not implement durability.
- The native client itself — this only makes the contract a valid conformance target; no Kotlin here.
- Any change to CFI↔Locator mapping, the CSP/loader injection (ADR-012), or foliate vendoring.
- New reader features. The reader's *requirements* are unchanged; only the types it imports change.

## Decisions

### D1 — The line: neutral = everything except the factory and its mount type

Classify each member by (a) DOM in its signature and (b) does the native reader need the same semantics:

| Member | DOM in sig? | Native needs it? | Home |
| --- | --- | --- | --- |
| `goTo`, `currentLocator`, `next`, `prev`, `seek` | no | yes | **neutral `Navigator`** |
| `applyPreferences`, `on('locatorChanged'\|'error')`, `destroy` | no | yes | **neutral `Navigator`** |
| `capabilities`, `sniff`, `open(source)` | no | yes | **neutral `FormatHandler`** |
| `pageCount()` | no (number) | not conformably (viewport-dependent) | **`platform/web` `WebNavigator`** |
| `createNavigator(pub, mount, opts)` | **yes (`HTMLElement`)** | no (native mounts its own view) | **`platform/web` `WebFormatHandler`** |
| `PublicationSource` (`size`/`read`) | no | yes | **neutral contract** |
| `ReadingPreferences` | no | yes | **`core/model`** |

Rationale for the two carve-outs: `createNavigator`'s `HTMLElement` is the one irreducibly web type;
the native factory takes a native view. `pageCount()` is a viewport-dependent estimate that *cannot* be
conformance-matched across platforms — and "can't be conformance-tested cross-platform" is precisely the
signal a member is not shared spec.

### D2 — Enriched neutral interfaces

```ts
// core/contracts
export type Unsubscribe = () => void

export interface PublicationSource {              // D4 — neutral random-access bytes
  size(): Promise<number>
  read(offset: number, length: number): Promise<Uint8Array>
}

export interface SniffInput { mediaType?: string; extension?: string; headBytes?: Uint8Array }

export interface NavigatorOptions {               // neutral; mount is a factory param, not here
  source: PublicationSource
  preferences?: ReadingPreferences                // from core/model
}

export interface FormatHandler {
  readonly id: string
  readonly mediaTypes: readonly MediaType[]
  readonly capabilities: FormatCapabilities
  sniff(input: SniffInput): number
  open(source: PublicationSource): Promise<Publication>   // replaces parse(bytes)
}

export interface Navigator {
  goTo(locator: Locator): Promise<void>
  next(): Promise<void>
  prev(): Promise<void>
  seek(fraction: number): Promise<void>
  currentLocator(): Locator
  applyPreferences(prefs: ReadingPreferences): void
  on(event: 'locatorChanged', cb: (locator: Locator) => void): Unsubscribe
  on(event: 'error', cb: (error: unknown) => void): Unsubscribe
  destroy(): void
}
```

```ts
// platform/web — the ONLY place HTMLElement appears
export interface WebNavigator extends Navigator { pageCount(): number | undefined }
export interface WebFormatHandler extends FormatHandler {
  createNavigator(pub: Publication, mount: HTMLElement, opts: NavigatorOptions): Promise<WebNavigator>
}
export function isWebFormatHandler(h: FormatHandler): h is WebFormatHandler // structural, unchanged
```

The plugin's `EpubFormatHandler implements WebFormatHandler`; `createEpubNavigator` returns
`WebNavigator`. The bespoke `EpubNavigator` interface stops being a type the app imports.

*Alternative considered:* keep the rich surface entirely web-side (status quo). Rejected — it denies the
native client a conformance target and entrenches the app→plugin coupling.

### D3 — `next`/`prev`/`seek` are navigator methods, not reader-computed `goTo`

Only the renderer knows where the next reflowable page boundary is; the reader cannot synthesize a
"next page" `Locator`. `DESIGN.md` §5.2 omitted these — that was a gap, not a decision. They are
DOM-free and belong in the neutral contract.

### D4 — `open(source: PublicationSource)` replaces `parse(bytes)`

`PublicationSource` is a neutral **random-access** byte source. A ZIP's central directory is at the end
of the archive, so the reader needs `read(offset, length)`, not a forward stream.

- An **OPFS file** and a **fully-buffered `Uint8Array`** are both `PublicationSource`s (ranged reads).
- A **sequential stream** cannot be range-read, so it is drained into an in-memory source first
  (identical to today's `drainStream`, just wrapped differently).
- Full-buffer callers wrap bytes in an in-memory source → **one entry point, no `parse(bytes)` footgun.**
- `host: HostBridge` is **not** a parameter of `open` (DESIGN.md §5.2 had it): the handler does no
  network I/O — the caller supplies the source — so the bridge is unnecessary here.

Web source builders (`File`/`ReadableStream`) live in `platform/web`; a `publicationSourceFromBytes`
(no web types) can live in `core` for tests and full-buffer callers.

### D5 — `PublicationSource → zip.js Reader` adapter (the one implementation risk)

Today: `new ZipReader(new BlobReader(file))`. zip.js's `ZipReader` accepts any `Reader` with a `size`
field and `readUint8Array(index, length)`. So the plugin wraps a neutral `PublicationSource`:

```ts
class PublicationSourceReader extends zip.Reader {        // in the plugin (web)
  constructor(private src: PublicationSource) { super() }
  async init() { this.size = await this.src.size() }
  readUint8Array(index: number, length: number) { return this.src.read(index, length) }
}
```

`openFoliateBook` then takes a `PublicationSource` (not a `File`) and builds
`new ZipReader(new PublicationSourceReader(source))`; everything downstream (the CSP-injecting
`loadText`, ADR-012; ranged reads, ADR-005) is unchanged because it already reads through the zip
reader. The `foliate-js/vendor/zip.js` ambient module gains a small `Reader` base-class declaration.

*Alternative:* keep `openFoliateBook(file: File)` and adapt at the edge. Rejected — it re-introduces a
web `File` on the hot path and leaves the contract's `open(source)` translating to a File internally.

### D6 — Drop the `loaded` event; keep typed `locatorChanged`/`error`

"loaded" is the `open`/`createNavigator` promise resolving — it already is (the factory resolves after
the initial render). The current `on('loaded')` is a sticky one-shot replay hack precisely because the
factory finished loading before a caller could subscribe; deleting it removes that hack. `error` stays —
post-load faults (a failed `goTo`) cannot reject a settled promise. Both events get typed callback
overloads (`locatorChanged → Locator`, `error → unknown`); the native client re-expresses them as a
stream/Flow with the same two cases.

### D7 — `currentLocator()`

Rename `currentLocation()` → `currentLocator()`. Matches `DESIGN.md` §5.2, the `locatorChanged` event,
the `Locator` return type, and the "locator" noun used everywhere (`locatorToCfi`, the sync "locator
outbox"). 3 call sites.

### D8 — `ReadingPreferences` moves to `core/model`

It is shared, serializable vocabulary (theme/typeface/size/line-height/paged-vs-scroll/RTL) that change
8 persists and may sync, and the native client re-expresses. The web-only mapping to readium-css/foliate
styles (`THEME_COLORS`, `buildReadingCss`) **stays in the plugin** — only the type moves. Zero external
refs today, so the move is free.

### D9 — DESIGN.md §5.2 + architecture.md

Rewrite §5.2 to: show the neutral interface and the `platform/web` factory split explicitly; remove
`HTMLElement` from the neutral interface; add `next`/`prev`/`seek`; define `PublicationSource`; document
`pageCount` as a web-only extension; and state the principle "the only platform-specific members are the
navigator factory and its mount type." Touch `architecture.md` §13's `epub/` layout note to mention the
`platform/web` `WebFormatHandler`/`WebNavigator` extension.

## Risks / Trade-offs

- **[`PublicationSourceReader` mis-implements the zip.js `Reader` contract]** → spike it against the
  pinned SHA first (D5); both fixtures (large + Pensées) and the existing ranged-read test must pass
  byte-identically; assert ranged reads via a `read`-spy that confirms the 14 MB file is never fully
  materialised.
- **[Contract change lands under the in-progress reader (change 7, 25/26)]** → do this change *before*
  the reader's final review task (7.3); the reader edits are mechanical (1 import, `open(source)` instead
  of `parse(bytes)`, one rename) and covered by `useNavigator.test.ts`.
- **[Bytes read twice — once to `open`→`Publication`, once in `createNavigator` to render]** → accepted:
  the neutral `Publication` is serializable metadata and cannot hold a live foliate handle, so the render
  path re-opens from the same `PublicationSource`; ranged reads keep the cost to the bytes actually
  touched. Documented, not optimised here.
- **[`pageCount` on `WebNavigator` keeps a thin app→web coupling]** → acceptable: the app is a web app
  and already imports from `platform/web` (`isWebFormatHandler`); the coupling it must NOT have — to the
  `@/plugins/formats/epub` *plugin* — is removed.
- **[Breaking the contract ripples to future formats (PDF/CBZ)]** → desirable: those formats are not
  built yet, so they are born against the corrected contract.

## Migration Plan

Single PR, bottom-up so the tree stays green at each step:

1. `core/model`: add `ReadingPreferences`.
2. `core/contracts`: enrich `Navigator`, rename `currentLocation`→`currentLocator`, add
   `capabilities`/`sniff`/`open` + `PublicationSource`/`SniffInput`/`Unsubscribe`/`NavigatorOptions`,
   remove `parse`. Add `publicationSourceFromBytes` (neutral).
3. `platform/web`: add `WebNavigator` (holds `pageCount`); `createNavigator` returns it; add
   `publicationSourceFromFile`/`...FromStream`.
4. Plugin: `PublicationSourceReader` + `openFoliateBook(source)`; `EpubFormatHandler implements
   WebFormatHandler`; navigator returns `WebNavigator`; import `ReadingPreferences` from `core/model`;
   delete the `loaded` emit + sticky replay; rename.
5. App: retype `useNavigator` to `WebNavigator`; build a `PublicationSource`; call `open(source)`; rename.
6. Tests: conformance test that the neutral `Navigator`/`FormatHandler` carry no DOM; update plugin +
   `useNavigator` tests for renames and `open(source)`.
7. Docs: rewrite `DESIGN.md` §5.2; update `architecture.md` §13.

Rollback is a revert of the single PR; no data/schema migration is involved (the changed types are
in-memory contracts, not persisted shapes).

## Open Questions

- Does `pageCount()` warrant a *neutral* counterpart later (e.g. a `position`/`total` pair on the
  relocate payload) so a native position bar has a spec for its "/ N" readout? Deferred — out of scope
  until the native client is real.
- Should `ReadingPreferences` join the `core-domain-model` "versioned JSON serialization" conformance
  set now, or when change 8 (which persists it) lands? Proposed: defer to change 8, which owns
  persistence; this change only introduces the type and the `no-DOM` invariant.
