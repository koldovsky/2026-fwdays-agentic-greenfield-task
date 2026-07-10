## Why

**Sequencing:** change 3 of 11 (see `doc/plans/web-app-roadmap.md`). Depends on `add-library-browse`
(change 2 — `core-domain-model` defines the `Connector` interface + the in-memory fixture connector)
and `add-app-shell` (change 1). Unblocks `add-source-flow` (change 4, the probe→capabilities→connect
screen) and lets the Library (change 2) render **real Komga data** through the same `Connector`
interface the fixture implemented.

Change 2 proved the Library on an in-memory fixture connector. This change delivers the **headless
data layer** that swaps a real server in behind that identical interface: the plugin **Host Bridge**
(the only surface a plugin may touch), the **plugin registry** (lazy-loaded, persisted, version-gated),
and the first real connector, **`connector-komga`**, talking Komga's native REST (ADR-007). There is
no screen of its own — once it lands, the existing Library renders Komga's catalogue unchanged.

## What Changes

- Add the **Host Bridge**: the single, platform-swappable surface a plugin receives — `http` (an
  HttpClient that, on web, is `fetch` and **enforces the plugin's declared network permissions**;
  transport + CORS are a host concern), `storage` (a key-value store **namespaced per plugin id**), and
  `logger`. Every method is `async` from day one (ADR-009) so the same plugin code runs in-process now
  and behind a sandbox proxy later.
- Add the **plugin registry**: register connectors/formats under an id with a **dynamic-`import()`
  loader** (the Factory); persist the enabled-id set and rehydrate it at startup; **lazy-load** the
  plugin chunk on first use, not at boot; resolve to one of `ready | installable | unsupported`; and
  **gate compatibility on a host-API semver range**, refusing an out-of-range plugin with a clear message.
- Add **`connector-komga`**: probe/identify a Komga server (public claim endpoint), authenticate as the
  least-privilege reader account over HTTP Basic, browse libraries → series → books, search, fetch
  thumbnails, and open/download book content with **range/streaming** (and per-page PSE for paged
  formats). It declares its capabilities honestly and **composes** the shared `_opds-core` utilities
  rather than inheriting (DESIGN.md §10). Integration-tested against the throwaway Docker Komga in
  `test/komga/`.
- **Out of scope here:** progress sync. The connector *declares* that Komga supports it, but the
  server-specific read/write `ProgressSyncStrategy` is owned by `progress-sync-strategy` (change 9).

## Capabilities

### New Capabilities

- `host-bridge`: the platform-swappable plugin contract surface (`http` enforcing network permissions,
  per-plugin namespaced `storage`, `logger`) — async from day one, no DOM/`fetch`/`window` in the contract.
- `plugin-registry`: lazy `import()`-loader registration, a persisted enabled set, `ready | installable
  | unsupported` resolution, and a host-API semver compatibility gate; "install" = first-party dynamic import.
- `connector-komga`: a Komga-REST `Connector` — probe, Basic-auth reader login, browse/search,
  thumbnails, and range/streaming content — composing `_opds-core`, integration-tested vs Docker Komga.

### Modified Capabilities

- None (greenfield).

## Impact

- Code: `src/core/contracts/index.ts` (HostBridge/HttpClient/KeyValueStore/Logger interfaces — already
  stubbed), `src/core/bridge/` (web HttpClient + namespaced storage impl) and `src/platform/web/`,
  `src/core/registry/index.ts` (registry impl: loaders, persistence, resolution, manifest + semver gate),
  `src/plugins/connectors/komga/index.ts` (the connector), `src/plugins/connectors/_opds-core/index.ts`
  (shared utilities, composed).
- Build/test: Vitest unit tests for the bridge + registry; **integration tests vs the Docker Komga**
  in `test/komga/` (`pnpm komga:up` / `komga:provision`), auth as `reader@edda.test`, library seeded
  from `test-epubs/`. CORS for web fetch is a host concern (`KOMGA_CORS_ALLOWED_ORIGINS`).
- No UI/screen and no `app/` chrome — this is a headless data layer that the existing Library consumes.
