## 1. Host Bridge

- [x] 1.1 Finalize the platform-neutral `HostBridge` contract in `src/core/contracts/` (`http`,
      `storage`, `logger` — all async; no DOM/`fetch`/`window` types)
- [x] 1.2 Implement the web `HttpClient` in `src/core/bridge/` / `src/platform/web/` over `fetch`,
      enforcing the plugin's declared `permissions.network` (refuse undeclared origins before transport;
      `*` allows any), leaving CORS/mixed-content to the host/browser
- [x] 1.3 Implement the per-plugin-id namespaced `KeyValueStore` (async get/set/delete; one plugin
      cannot read/write another's keys) and the attributable `Logger`
- [x] 1.4 Assemble a per-plugin `HostBridge` factory (binds id → network permissions + storage namespace)
- [x] 1.5 Vitest: permission enforcement (declared allowed / undeclared refused with no network call /
      wildcard), storage isolation + round-trip + delete, logger attribution, async surfaces

## 2. Plugin registry

- [x] 2.1 Implement registry registration with dynamic-`import()` loaders (the Factory) in
      `src/core/registry/`; assert the loader is NOT invoked at registration/boot
- [x] 2.2 Persist the enabled-id set and rehydrate it on startup without eagerly loading chunks
- [x] 2.3 Implement `resolveConnector(probe)` / `resolveFormat(sniff)` returning
      `ready | installable | unsupported` (installable carries the suggested manifest)
- [x] 2.4 Add `PluginManifest` (`hostApi` range, capabilities, `permissions.network`) and the host-API
      semver gate: refuse out-of-range plugins with a clear message; load in-range normally
- [x] 2.5 Implement install/enable as a first-party dynamic `import()` + persist (no remote code)
- [x] 2.6 Vitest: lazy load on first use, persistence/rehydration, three-state resolution, semver gate
      (in/out of range), first-party-import install

## 3. Komga connector (composes `_opds-core`)

- [x] 3.1 Implement `probe(url)` via the public claim endpoint (`GET /api/v1/claim`) in
      `src/plugins/connectors/komga/`
- [x] 3.2 Implement HTTP Basic auth as the reader account; verify via `GET /api/v2/users/me`; map `401`
      to a clear authentication error
- [x] 3.3 Implement browse: libraries → series → books (`/api/v1/libraries`, `/series`, `/books`) with
      paging, mapped to the shared `Connector`/`BookRef` domain types (owned by `core-domain-model`,
      change 2)
- [x] 3.4 Implement search (`/api/v1/books?search=…`) and thumbnails (`/books/{id}/thumbnail`)
- [x] 3.5 Implement content: open/download via `GET /api/v1/books/{id}/file` with `Range` → `206`, and
      per-page PSE (`/books/{id}/pages/{n}`)
- [x] 3.6 Declare capabilities honestly (search/download/pagedStreaming/thumbnails true; `komga-rest` +
      basic; `progressSync` declared but read/write deferred to `progress-sync-strategy`, change 9)
- [x] 3.7 Compose `_opds-core` (feed/manifest parse, acquisition-link resolution, progression mapping)
      in `src/plugins/connectors/_opds-core/` — by composition, no OPDS-connector inheritance
- [x] 3.8 Add the connector's `PluginManifest` + loader and register it in the catalogue

## 4. Integration harness (Docker Komga)

- [x] 4.1 Wire a Vitest integration suite that targets `http://localhost:25600`, gated on the server
      being provisioned (`pnpm komga:provision`); skip/fail clearly when it is absent (never silent pass)
- [x] 4.2 Integration scenarios vs the seeded server: probe succeeds; auth as `reader@edda.test`; browse
      lists the two `test-epubs/` EPUBs; search finds a seeded book; thumbnail returns bytes; download
      returns full bytes and a range request returns a `206` slice
- [x] 4.3 Document the web CORS host setup (`KOMGA_CORS_ALLOWED_ORIGINS`) needed for `fetch` in a browser

## 5. Verification (maker ≠ checker)

- [x] 5.1 `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` all green
- [x] 5.2 Real-data fidelity check (this change is headless — no screen, so no `doc/web/*.png` screenshot
      applies): run `pnpm komga:up` / `pnpm komga:provision` and confirm the integration suite (task 4.2)
      passes against the live Docker Komga seeded from `test-epubs/`
- [x] 5.3 Independent review pass (`/code-review` or a separate agent) on the diff; verify `core/contracts`
      stays platform-neutral and the connector composes `_opds-core` (no inheritance); address findings
- [x] 5.4 `openspec validate add-connector-komga --strict` passes
