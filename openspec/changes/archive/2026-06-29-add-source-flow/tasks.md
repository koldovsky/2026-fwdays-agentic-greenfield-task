## 1. Server prober (core/dispatch)

- [x] 1.1 Add a `serverProbe(url, registry, host)` in `src/core/dispatch/` that determines reachability
      via a bounded (`AbortController` timeout) request delegated to a connector / `HostBridge.http`
      (no direct `fetch`/DOM in the prober)
- [x] 1.2 Probe all installed connectors' `probe(url)` concurrently; select the highest-confidence
      result above a threshold, breaking ties toward the more specialized connector (Komga over OPDS)
- [x] 1.3 Map the outcome to the registry's `Resolution<Connector>` (`ready`/`installable`/
      `unsupported`) plus an added `unreachable { reason }`; on no installed match, consult
      `registry.available()` for an `installable` suggestion, then the generic OPDS connector
      (`connector.opds`) as the always-available fallback
- [x] 1.4 Populate the detected result with kind, connector id, and advertised `ConnectorCapabilities`
- [x] 1.5 Vitest unit tests with stub connectors + a non-`fetch` host bridge: confidence ordering,
      Komga-over-OPDS specificity, installable suggestion, OPDS fallback, unreachable (timeout/refused),
      reachable-but-unsupported, and the platform-neutral conformance case

## 2. Add-a-source modal UI (screen 05)

- [x] 2.1 Build `AddSourceModal` using the native `<dialog>` (`showModal()`, Esc dismiss, `closedby`
      light-dismiss + fallback) composing the `design-system` stepper/chip/card/button/badge primitives,
      matched to `doc/web/05-add-source-desktop.png`
- [x] 2.2 SERVER ADDRESS field wired to `server-prober`; show the "Reachable" indicator on success and a
      not-reachable state otherwise; gate Connect on a successful detection
- [x] 2.3 Detected-server card (name, monospace connector id, bundled/installable, protocol summary,
      "Adapter ready" badge) and CAPABILITIES chip row derived from the probe's advertised capabilities
- [x] 2.4 Stepper advances Address → Detected → Sign in; USERNAME + masked PASSWORD fields; footer
      "Credentials stored on this device only"; Cancel / Connect buttons per the maket
- [x] 2.5 Vitest component tests: maket-fidelity copy/labels/chips, reachable vs unreachable gating,
      installable-vs-ready card, Cancel discards

## 3. Source persistence & on-device credentials

- [x] 3.1 Add a sources store persisting a source record (`sourceId`, `connectorId`, `baseUrl`,
      `displayName`, `credentialRef`) to on-device storage; mint the `sourceId` used by the
      `(sourceId, bookId, mediaType)` progress key (cross-ref `core-domain-model`)
- [x] 3.2 Store credentials in a separate `sourceId`-keyed on-device credential record, excluded from
      any syncable payload; attach them as auth (Basic per `capabilities.auth`) only on requests to the
      user's own server via `HostBridge.http`
- [x] 3.3 On Connect: build `ConnectorConfig`, establish the `Session` via the resolving connector,
      persist both records, and emit the new source to the sidebar
- [x] 3.4 Security test: connecting a source writes no secret into the syncable source record

## 4. Sidebar integration (cross-ref app-shell)

- [x] 4.1 Surface a newly connected source in the sidebar Sources region with its status dot and
      monospace descriptor, and wire the region's "Add source" affordance to open the modal
- [x] 4.2 Test: after Connect, the source appears in the Sources region; after Cancel it does not

## 5. Komga + OPDS integration

- [x] 5.1 Integration test against the Docker Komga (`pnpm komga:provision`; reader
      `reader@edda.test` / `edda-reader-pw`): probe detects kind `komga` (not OPDS) with the expected
      capabilities, Connect persists the source and it appears in the sidebar
- [x] 5.2 Bare-OPDS fallback test: a feed no specialized connector claims is detected via
      `connector.opds` with OPDS-advertised chips and can be connected

## 6. Verification (maker ≠ checker)

- [x] 6.1 `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` all green
- [x] 6.2 Design-fidelity check: Playwright screenshot of the open modal (detected Komga state) compared
      against `doc/web/05-add-source-desktop.png` — title/subtitle, stepper, Reachable, detected card,
      capability chips, credential fields, on-device footer, Cancel/Connect
- [x] 6.3 Independent review pass (`/code-review` or a separate agent) on the diff, with focus on the
      credential boundary (no secrets in syncable metadata, no third-party egress); address findings
- [x] 6.4 `openspec validate add-source-flow --strict` passes
