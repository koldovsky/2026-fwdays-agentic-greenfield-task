## Context

This change makes Edda's **plugin model** real and visible. Two maket screens are the visual source
of truth: `doc/web/06-extensions-desktop.png` (the registry — INSTALLED OPDS/Komga/EPUB + AVAILABLE
PDF/Kavita/Calibre/CBZ, a "Host API v1.2" pill, a "First-party & sandboxed" footer) and
`doc/web/07-capability-missing-desktop.png` (the "Install PDF support?" prompt that installs
`format.pdf` and reopens the book). The runtime behind them is specified in `DESIGN.md` §6 (manifest,
registry, loading), §7 (media-type sniffing), §8.1 (open-a-book-whose-format-isn't-installed), §10
(OPDS↔Komga composition) and §11 (security/sandboxing); the stack fixes pdfjs-dist for PDF and
ADR-010 fixes "first-party plugins only".

The core `plugin-registry` and `host-bridge` (resolve/install/enable/disable/persist, the
`HostBridge` surface) are created by `add-connector-komga`; the `server-prober` by `add-source-flow`.
This change *uses* them and adds the dispatcher, the two screens, and the first OPDS + PDF plugins.

## Goals / Non-Goals

**Goals:**
- One dispatch path that turns "open this resource" into `ready | installable | unsupported` for both
  formats and connectors, via media-type sniffing + the registry.
- Install-on-demand as a **first-party dynamic `import()` + persisted enabled id** — no remote code.
- The Observer flow: a `CapabilityMissing` event decoupling the (platform-neutral) dispatcher from the
  UI prompt, an automatic **retry-after-install**, and graceful **raw-download** degradation.
- The Extensions screen (06) and the capability-missing modal (07), matched to the maket.
- A real always-on **OPDS** fallback connector and a real install-on-demand **PDF** format — enough to
  demonstrate the loop end-to-end.

**Non-Goals:**
- Remote / third-party plugins, an SDK, a marketplace, or sandboxed Worker/iframe execution — out of
  scope per ADR-010 and §11 (the contract is *shaped* for it; it is not built here).
- Feature-complete PDF (annotations, forms) — only sniff/parse/locate/range-stream to prove
  install→open.
- Working runtimes for Kavita/Calibre/CBZ — they render in AVAILABLE from catalog manifests; their
  handlers arrive in later changes.
- The sync-engine outbox / furthest-wins and OPFS storage themselves — owned by `add-offline-and-sync`;
  this change only declares OPDS's honest progress capability and reuses the download path.

## Decisions

- **Install = dynamic `import()` of a first-party lazy chunk, then persist the enabled id.** A plugin
  "loader" is `() => import('./plugins/formats/pdf')`; the registry awaits it, registers the instance,
  and persists the choice so it is used automatically thereafter (`DESIGN.md` §6.4). *Alternative:*
  fetch a remote module + verify SRI and run it in a sandbox — rejected for now (ADR-010 / §11: a
  future capability; building it now adds attack surface with no in-scope payoff).
- **CapabilityMissing is an Observer event on the host `EventBus`, not a return value or UI callback.**
  The dispatcher (in `core/`, platform-neutral) emits `CapabilityMissing(suggestion)`; the UI
  subscribes and renders the modal. *Alternative:* dispatcher returns a Vue component / throws to the
  view — rejected; it would put DOM/UI assumptions in `core/contracts`, which the native client must
  re-express (load-bearing invariant).
- **A media-type sniffer with source priority `connector metadata > HTTP Content-Type > extension >
  magic bytes`,** returning a confidence; the dispatcher picks the highest-confidence **installed**
  format (`DESIGN.md` §7). *Alternative:* extension-only detection — rejected; unreliable, and OPDS/
  Komga already supply trustworthy media types.
- **A single tri-state `Resolution<T>` (`ready | installable | unsupported`)** is the one dispatch
  contract for both `resolveFormat` and `resolveConnector`. *Alternative:* booleans + thrown errors —
  rejected; the tri-state makes "known-but-not-installed" a first-class, testable state that drives the
  prompt.
- **Retry-after-install re-issues the original `openBook(bookRef)`** rather than resuming a paused,
  half-built open. Open is idempotent and cheap up to resolution; re-running it keeps the dispatcher
  stateless and matches the §8.1 sequence exactly. *Alternative:* suspend/resume a pending open —
  rejected (stateful, harder to reason about and test).
- **Unsupported degrades to the raw file download** plus a clear "format not supported" message; the
  same raw-download path backs the modal's "Not now" secondary action. *Alternative:* a dead-end error
  — rejected; §8.1 mandates the user is never fully blocked from their own file.
- **`connector.opds` composes a shared `_opds-core`** (feed parsing, acquisition-link resolution, OPDS
  v2 progression mapping); `connector.komga` composes the same module (`DESIGN.md` §10). *Alternative:*
  `KomgaConnector extends OpdsConnector` — rejected (§10: an inheritance chain future connectors fight).
- **OPDS declares `progressSync` honestly per server:** `true` only when the catalog advertises OPDS v2
  progression, else `false` (local-only). *Alternative:* always claim sync — rejected; it would make
  the sync engine attempt writes a Calibre-style server can't accept.
- **`format.pdf` is not bundled; it ships as a lazy chunk.** Readium + EPUB is already heavy; keeping
  pdfjs-dist behind install-on-demand holds the initial bundle small (§6.2) and gives screen 07 a real
  thing to install. The imperative `Publication`/`Navigator` it produces are `markRaw()`'d (ADR-001).

## Risks / Trade-offs

- [A persisted enabled id points at a chunk the current build no longer ships] → the registry hydrates
  against the static catalog and validates `hostApi` before `import()`; a missing/incompatible id
  surfaces a clear message (per "Host API v1.2" / §12) instead of a hard crash.
- [User disables a bundled connector and strands their library] → toggles are reversible and never
  delete data; `connector.opds` is the always-on fallback, so OPDS-reachable sources keep working.
- [The sniffer mis-detects a type — wrong format opens, or a false "unsupported"] → multi-source
  confidence with a magic-byte tiebreak (`%PDF`); and because `unsupported` always offers the raw
  download, a wrong guess never fully blocks the user.
- [PDF page-locators diverge from EPUB CFI locators, confusing progress] → progress is keyed per
  `(sourceId, bookId, mediaType)` (load-bearing invariant), so the EPUB and PDF of the same title hold
  separate, legitimate positions.
- [PDF range reads routed through the Service Worker corrupt `206` responses] → book bytes bypass the
  SW (ADR-005); `format.pdf` reads ranges from the `PublicationSource` (OPFS `File.slice` / connector
  `openResource`), never via Workbox.

## Open Questions

- **`_opds-core` ownership vs. sequencing.** `connector.komga` (change 3) needs `_opds-core` before
  `connector.opds` (change 10) formally introduces it. Treated as a shared first-party utility the OPDS
  connector finalizes; the orchestrator should reconcile which change physically lands the module
  (likely a minimal core in change 3, completed here). Specs stay behavioral ("composes shared OPDS
  utilities") to avoid pinning ownership.
- **"installs in ~2s" copy.** Treated as approximate maket caption, not a required artificial delay;
  install resolves as fast as the dynamic import completes.
- Exact `hostApi`-incompatibility prompt copy is deferred to `plugin-registry` / §12.
