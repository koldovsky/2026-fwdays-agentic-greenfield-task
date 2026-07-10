# Edda — Architecture

> Generic project artifact. Describes **how the system is structured**. For scope see [`goals.md`](./goals.md); for technology see [`stack.md`](./stack.md).
> Deep subsystem detail (full TypeScript interfaces, sequence diagrams): [`../../DESIGN-CONNECTORS.md`](../../DESIGN-CONNECTORS.md).

## Shape

Edda is **a platform-agnostic core plus interchangeable plugins behind a single host contract.** The core owns state and orchestration; plugins are stateless adapters chosen at runtime.

- **Two plugin kinds:**
  - **Connector** — adapts a content source (Komga REST, OPDS) to one internal interface.
  - **Format** — parses and renders a publication (EPUB now; PDF / CBZ / FB2 later).
- **Plugin-shaped:** each connector/format is a self-describing manifest + declared capabilities. The host never hardcodes which exist; it resolves them at runtime. (All plugins are first-party — see [`goals.md`](./goals.md) non-goals.)
- **Plugins don't own machinery:** caching and the durable offline outbox live in the **core**. Plugins map requests↔responses and bytes↔publications; a connector additionally *provides* its server-specific **progress-sync Strategy** (it does not own the queue or scheduling — the core sync engine drives it). See [Progress sync](#progress-sync-strategy-connector-scoped).
- **Single contact surface — the Host Bridge:** plugins only ever touch a `HostBridge`. This makes transport/CORS a host concern (not a plugin one) and keeps plugins portable across platforms.

```
UI (Vue) ─▶ Library context ─┐
UI (Vue) ─▶ Reader context  ─┤
                             ▼
            Capability Dispatcher ─▶ Media-type Sniffer + Server Prober
                             │
                             ▼
                     Plugin Registry ──▶ Connector plugins (Komga, OPDS)
                             │        └─▶ Format plugins (EPUB, PDF…)
                             ▼
                       Host Bridge ──▶ platform HTTP · OPFS storage
```

## Design patterns

| Pattern | Where | Why |
|---|---|---|
| **Strategy** | `Connector`, `FormatHandler`, `ProgressSyncStrategy` | interchangeable algorithms chosen at runtime — including per-server progress sync |
| **Adapter** | each concrete connector | wraps a foreign API (Komga REST, OPDS) into our interface |
| **Registry / Service Locator** | `PluginRegistry` | discovery + selection of plugins |
| **Factory** | plugin `loader` | lazy instantiation via dynamic `import()` |
| **Composition over inheritance** | `KomgaConnector` composes shared `_opds-core` | avoids a brittle inheritance chain |
| **Observer** | `CapabilityMissing` events | decouples detection from install UI |

## Domain model (Readium-aligned)

Everything normalises onto a **Readium-aligned Publication + Locator** model so progress, TOC, bookmarks, and search behave the same across formats **and** across platforms. This model is the backbone of cross-platform reuse.

- **`Locator`** — a position inside a publication; also the unit the sync engine stores.
- **`Publication`** — normalised output of a `FormatHandler` (metadata, reading order/spine, resources, TOC, layout).
- **`BookRef`** — lightweight reference from browse/search before a file is opened.

Reading positions are keyed per **`(sourceId, bookId, mediaType)`** — the same title as EPUB vs PDF yields different locators and is two legitimate, separate positions. The model and its serialization are kept **platform-neutral** (no DOM / network types) so a future native client serializes the identical shape. Full interfaces: `DESIGN-CONNECTORS.md` §4–§5.

## Host Bridge (the plugin contract)

The only surface a plugin may touch: `http`, `storage`, `logger`, `events`, `mediaType`, `locator` (all async). `http` enforces declared network permissions; `storage` is namespaced per plugin id. This decouples plugins from app internals and is the seam that keeps the same plugin working on web (`fetch`) and on native (native HTTP, no CORS).

## Plugin system

- **Registry** — tracks installed/enabled plugins, resolves a connector/format for a given input (`ready | installable | unsupported`), and gates compatibility on a host-API semver range. The enabled-plugin set is persisted; chunks are lazy-loaded on first use, not at boot.
- **Dispatcher** — picks the right plugin for a resource and drives the "suggest install" flow when a capability is missing.
- **Sniffer** — identifies media type in priority order: connector metadata → HTTP `Content-Type` → file extension → magic bytes.
- **Server Prober** — asks connectors to identify an added server, falling back to generic OPDS.

## Progress sync (Strategy, connector-scoped)

Sync is **not one-size-fits-all**: what a server supports and how it stores progress varies (Komga's native REST read-progress, OPDS v2 progression, Kavita / KOReader, or nothing at all). So progress sync is modelled as a **Strategy**, owned by the connector domain because it is inherently server-specific — while the queue and policy stay in core.

- **`ProgressSyncStrategy`** (interface in `core/contracts`) — reads/writes a server-side `Locator` and declares what the server supports (e.g. granularity: per-book vs per-locator). This formalises the optional `getProgress`/`setProgress` methods from `DESIGN-CONNECTORS.md` §5.1 into a named, swappable strategy.
- **Connectors provide the strategy** that matches their server, gated by their `progressSync` capability. A connector with `progressSync: false` (Calibre, bare OPDS) provides a **local-only / no-op** strategy — the app still works, progress just stays on-device.
- **The core sync engine is the Strategy context.** It owns everything server-independent: the durable **outbox**, drain scheduling (on reconnect / app focus), idempotent retry, and **furthest-progression-wins** reconciliation (it reads remote progress *through the strategy* before writing). It never hardcodes a server's mechanics.

**Komga v1 fully uses Komga's native REST** for both reading (streaming/PSE) and progress sync — its modern endpoints, not the OPDS lowest-common-denominator. OPDS arrives later as the generic fallback strategy. Because the strategy interface and the on-the-wire `Locator` are platform-neutral, the future native client reuses the same sync protocol with its own strategy implementation.

## Capability decomposition

The system's behaviour is decomposed into cohesive **capabilities** (each will later become one spec). Generic list; v1 = first milestone, *Later* = roadmap.

**Foundation:** `core-domain-model` · `host-bridge` · `plugin-registry` · `capability-dispatch` *(all v1)*
**Connectors:** `connector-komga` *(v1, primary)* · `connector-opds` *(later, generic fallback)*
**Formats:** `format-epub` *(v1)* · `format-pdf` *(later)*
**Reader:** `reader-navigation` *(v1)* · `reader-isolation` *(v1 — active; ADR-013)*
**Offline & sync:** `offline-storage` *(v1)* · `sync-engine` *(v1 — core: outbox + furthest-wins; the Strategy context)* · `progress-sync-strategy` *(interface in contracts; Komga's implementation ships with `connector-komga` in v1, OPDS later)*
**App / shell:** `library-browse` *(v1)* · `pwa-shell` *(v1)*

## Cross-platform reuse contract

The future native client shares **no UI or rendering code** with the web app. What is shared is the **specification layer** — model, protocols, and capability semantics — implemented independently on each platform and held compatible by conformance tests.

| Concern | Shared web ↔ native? | How |
|---|---|---|
| Domain model (Locator, Publication, BookRef) | ✅ | Readium-aligned shapes + a versioned JSON serialization both platforms read/write identically |
| Connector protocol (Komga mapping, capability semantics, probe/browse/content/progress) | ✅ | specified once; implemented per-platform |
| Sync protocol (`ProgressSyncStrategy` interface, outbox semantics, furthest-progression-wins, progress keying) | ✅ | specified once; engine + strategy implemented per-platform |
| Capability/manifest semantics & host-API versioning | ✅ | same rules on both |
| UI | ❌ | Vue (web) vs Compose (native) |
| Rendering engine | ❌ | foliate-js (web) vs Readium-Kotlin (native) — both emit the same Locator shape |
| HTTP client | ❌ | `fetch` (web) vs native HTTP (no CORS) — behind `HostBridge.http` |
| Storage | ❌ | OPFS + IndexedDB (web) vs filesystem + SQLite (native) — behind `HostBridge.storage` |

**Hard rule:** `core/contracts` and `core/model` carry no web-only assumptions (no DOM, no `fetch`/`window`). They are the prose the native client re-expresses; the serialization conformance tests are the guarantee the two stay compatible.

## Directory layout

Mirrors `DESIGN-CONNECTORS.md` §13. `core/contracts` holds interfaces only; `plugins/` depend on `contracts`, never the reverse (enforced by lint).

```
src/
  core/
    model/        # Locator, Publication, BookRef, MediaType — plain serializable, platform-neutral
    contracts/    # Connector, FormatHandler, Navigator, HostBridge, manifests (interfaces only)
    registry/     # PluginRegistry, resolution, enabled-ID persistence
    dispatch/     # Capability Dispatcher, Server Prober
    sniff/        # media-type sniffer
    bridge/       # HostBridge interface + in-process impl
    sync/         # outbox + furthest-progression-wins reconciler
  plugins/
    connectors/
      _opds-core/ # shared OPDS utilities
      komga/      # primary v1 connector (composes _opds-core)
      opds/       # generic OPDS fallback (later)
    formats/
      epub/       # WebFormatHandler over vendored foliate-js + CFI↔Locator adapter;
                  # open(source: PublicationSource) is the single entry point (no parse(bytes))
      pdf/        # installable (later)
  platform/
    web/          # fetch HttpClient + OPFS storage  (native variant is a separate codebase)
                  # Also: WebFormatHandler / WebNavigator extension (the ONLY layer that may carry
                  # HTMLElement / File / ReadableStream — the neutral FormatHandler/Navigator in
                  # core/contracts carry zero DOM); publicationSourceFromFile / ...FromStream builders.
      reader-frame/ # separate-origin EPUB renderer (ADR-013): harness, bridge protocol, CSS, to-locator
  app/            # Vue shell, router, stores, install prompts
sw.ts             # service worker (precache shell, runtime-cache chunks, denylist byte routes)
vendor/
  foliate-js/     # git submodule pinned at a known-good SHA
```
