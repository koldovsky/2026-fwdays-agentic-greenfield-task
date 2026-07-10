## Context

This is a **headless** change with no screen of its own (web-app-roadmap row 3 — "data layer"). It
delivers the three foundation pieces every connector needs and the first real connector. The shapes are
already sketched as stubs: `src/core/contracts/index.ts` (`HostBridge`, `HttpClient`, `KeyValueStore`,
`Logger`, `Connector`), `src/core/registry/index.ts` (`PluginRegistry`), `src/plugins/connectors/komga/`
and `src/plugins/connectors/_opds-core/`. The deep design is `DESIGN.md` §5.1 (Connector), §6 (manifest,
registry/resolution, Host Bridge, loading), §10 (Komga vs OPDS — composition, not inheritance), and
`stack.md` ADR-007 (Komga first, native REST), ADR-009 (Host Bridge async from day one), ADR-010
(first-party plugins only). The live server to develop and test against is `test/komga/` (ADR-007's
throwaway Docker Komga, seeded from `test-epubs/`).

The `Connector` interface itself is the **shared vocabulary** owned by `core-domain-model` (change 2),
which uses it for its in-memory fixture connector. This change provides a *second implementation* of
that same interface — that is the whole point: the Library swaps Komga in with no UI change.

## Goals / Non-Goals

**Goals:**
- A platform-neutral `HostBridge` (`http` / `storage` / `logger`, all async) that is the **only** surface
  a plugin touches, with `http` enforcing the plugin's declared network permissions and `storage`
  namespaced per plugin id — web impl over `fetch` + browser storage, native impl swappable later.
- A registry that registers lazy `import()` loaders, persists the enabled set, lazy-loads chunks on
  first use, resolves `ready | installable | unsupported`, and refuses host-API-incompatible plugins.
- A `connector-komga` covering probe, Basic-auth reader login, browse (libraries → series → books),
  search, thumbnails, and range/streaming content — composing `_opds-core`, declaring capabilities
  honestly, integration-tested against the Docker Komga.

**Non-Goals:**
- **Progress sync** — Komga's read-progress read/write and on-deck feeds are `progress-sync-strategy`
  (change 9). This change only *declares* that the server supports sync; it performs no progress I/O.
- The **Add-source UI** (probe→capabilities→connect screen) and the **Server Prober** — `add-source`
  (change 4). This change exposes the connector behaviour those will drive.
- A sandbox/Worker runtime for plugins — first-party only for now (ADR-010); the bridge is merely
  *shaped* so a sandbox proxy can slot in later (DESIGN.md §11).
- The OPDS fallback connector (`connector-opds`) and remote/third-party plugin distribution — change 10
  and later.

## Decisions

- **`HostBridge` = `{ http, storage, logger }`, async from day one (ADR-009).** Plugins never import
  app internals; they receive only this object. Async signatures mean the identical plugin runs
  in-process today and behind a `postMessage` sandbox proxy later with no rewrite. *Alternative:* sync
  in-process bridge now, async later — rejected; it would force a breaking rewrite of every plugin at
  sandbox time.
- **`http` enforces `permissions.network`; transport + CORS are the host's job.** The web `HttpClient`
  is `fetch`; it refuses a request to an origin the plugin did not declare *before* any network call.
  CORS and mixed-content are therefore a **host/browser concern, not a plugin concern** — on web the
  user must allowlist the app origin in their Komga `KOMGA_CORS_ALLOWED_ORIGINS` (a deployment setting);
  on native the same plugin runs over a native HTTP client with no CORS at all. *Alternative:* let the
  connector call `fetch` directly — rejected; it breaks portability and the permission seam.
- **`storage` namespaced per plugin id.** Keys are scoped so one plugin cannot read or write another's
  data (DESIGN.md §6.3, §11). *Alternative:* one shared store with a documented prefix convention —
  rejected; isolation must be enforced, not conventional.
- **Registry persists the enabled-id *set*, not chunks; chunks lazy-load on first use.** Startup
  rehydrates which plugins are enabled and registers their `import()` loaders, but does not import them
  (Readium/EPUB is heavy — keep the initial bundle small; DESIGN.md §6.2). *Alternative:* eager-load all
  enabled plugins at boot — rejected on bundle size and startup cost.
- **Resolution is a three-state union.** `resolveConnector(probe)` / `resolveFormat(sniff)` return
  `{ ready, instance } | { installable, suggestion } | { unsupported }`, which is exactly what the
  add-source / capability-missing flows (changes 4, 10) branch on. *Alternative:* throw on "not
  installed" — rejected; "installable" is a normal, expected outcome, not an error.
- **Host-API semver gate.** Each `PluginManifest` declares a `hostApi` range; the registry refuses to
  load/enable a plugin whose range does not satisfy `HOST_API_VERSION`, with a clear message (DESIGN.md
  §12). *Alternative:* load and hope — rejected; a contract mismatch must fail loud and early.
- **"Install" = first-party dynamic `import()` (ADR-010).** Enabling a plugin imports a bundled chunk
  and persists the choice; **no remote code is fetched or executed.** *Alternative:* fetch+eval a remote
  module now — rejected; out of scope and a security risk until the §11 sandbox exists.
- **Komga uses its native REST (ADR-007), mapped per the table below.** Richer paging/search, PSE, and
  thumbnails than OPDS's lowest common denominator.

  | Domain operation | Komga REST | Notes |
  |---|---|---|
  | probe(url) | `GET /api/v1/claim` | public, no creds; its presence/shape identifies a Komga server |
  | authenticate | `Authorization: Basic …`; verify `GET /api/v2/users/me` | reader account; read-only roles |
  | list libraries | `GET /api/v1/libraries` | top-level shelves |
  | list series | `GET /api/v1/series?library_id=…&page=…&size=…` | per library, paged |
  | list books | `GET /api/v1/series/{id}/books?page=…` or `GET /api/v1/books?…` | paged |
  | get book | `GET /api/v1/books/{id}` | metadata + media type |
  | search | `GET /api/v1/books?search=…` (and `/series?search=…`) | term match |
  | thumbnails | `GET /api/v1/books/{id}/thumbnail`, `/series/{id}/thumbnail` | image bytes, authed |
  | open content (range) | `GET /api/v1/books/{id}/file` with `Range:` → `206` | EPUB bytes for reading/offline |
  | page streaming (PSE) | `GET /api/v1/books/{id}/pages/{n}` (+ `…/pages`) | comics/CBZ — `pagedStreaming` |
  | progress *(change 9)* | `GET`/`PATCH /api/v1/books/{id}/read-progress`, on-deck feeds | **declared only**, not implemented here |

- **Authenticate as the least-privilege reader.** The connector logs in as `reader@edda.test` /
  `edda-reader-pw` (roles `FILE_DOWNLOAD` + `PAGE_STREAMING`); the admin account exists only to provision
  the test server. This proves the connector works with the realistic, minimal privilege set.
- **Compose `_opds-core`, do not inherit (DESIGN.md §10).** Komga is OPDS-capable, so `_opds-core`'s feed/
  Readium-manifest parsing, acquisition-link resolution, and progression mapping are reused **by
  composition**; Komga overrides with native REST only where it is richer. *Alternative:* `KomgaConnector
  extends OpdsConnector` — rejected; an inheritance chain future connectors would fight.
- **Docker-Komga integration harness, gated.** Komga-dependent tests run against `test/komga/`
  (`pnpm komga:up` then the blocking `pnpm komga:provision` for CI/e2e gating). They authenticate as the
  reader and assert against the two EPUBs seeded from `test-epubs/`. When the server is absent the suite
  **skips/fails clearly** rather than passing silently. *Alternative:* mock the whole REST surface —
  rejected as the primary signal; mapping bugs only surface against a real Komga (mocks are kept for fast
  unit coverage of the bridge/registry, not as the connector's source of truth).

## Risks / Trade-offs

- [CORS blocks web `fetch` against a real Komga] → Documented host setup: add the app origin to
  `KOMGA_CORS_ALLOWED_ORIGINS`; the bridge surfaces a host transport error (not a plugin bug). Native
  runs CORS-free over the same plugin.
- [Integration tests are flaky/slow because Komga scans asynchronously] → Gate on the blocking
  `pnpm komga:provision` (it polls until both EPUBs are indexed and exits 0); tests assume a provisioned
  server and skip clearly otherwise.
- [Declaring `progressSync: true` while shipping no strategy could mislead the sync engine] → The
  capability is honest (the *server* supports it) but the read/write strategy is explicitly deferred to
  change 9; this change performs no progress I/O and references change 9 in the spec.
- [Komga REST shape drifts across versions] → Pin the test image (`gotson/komga:1.24.4` per
  `test/komga/`); keep the endpoint mapping in one place; the host-API/connector capability declaration
  is the seam that surfaces incompatibilities.
- [Eager chunk loading creeps back in] → Registry tests assert a registered loader is **not** invoked
  until first use, keeping the initial bundle small.

## Open Questions

- Exact Komga search endpoint for richer queries (the newer `POST /api/v1/books/list` condition syntax
  vs `?search=`) — the spec stays behavioural ("search by term returns matches"); the precise call is an
  implementation choice validated against the pinned test image.
- Whether thumbnails should be range-cached via the bridge or fetched whole — deferred to
  `offline-storage` (change 9); this change just fetches the image bytes.
