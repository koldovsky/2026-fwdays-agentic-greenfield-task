## Context

`DESIGN.md` §8.2 specifies the "add a server" flow: the UI hands a URL to a **server prober**, which
asks each connector "is this your kind of server?" and returns a kind + capabilities; the registry
then resolves that to `ready | installable | unsupported` (§6.2). `doc/web/05-add-source-desktop.png`
is the visual source of truth for the modal that wraps this flow. Change 3 (`add-connector-komga`)
already provides the `PluginRegistry` (`installed`/`available`/`resolveConnector`/`install`), the
`Connector` contract (`probe`/`connect`, `ConnectorCapabilities`), and the `HostBridge`
(`http` = `fetch` on web). This change adds the detection layer and the screen on top of them.

Two decisions carry real weight and justify this document: the **prober algorithm** (ordering,
confidence, fallback, platform-neutrality) and **on-device credential storage** (a security boundary).

## Goals / Non-Goals

**Goals:**
- A connector-agnostic prober: reachability → confidence-ranked installed-connector probes → catalog
  fallback → generic OPDS fallback, returning the detected kind + advertised capabilities.
- Faithfully render screen 05: stepper, reachability indicator, detected card, capability chips,
  credential fields, on-device-only footer, Cancel/Connect.
- Persist a connected source on-device and surface it in the sidebar Sources region.
- Keep credentials strictly on-device; never transmit them to Edda or any third party.

**Non-Goals:**
- Building the generic OPDS connector itself (`connector-opds`, owned by
  `add-extensions-and-capability-install`); here it is referenced as the always-available fallback.
- The capability-missing / install-on-demand sheet UX for installable connectors (screen 07, owned by
  `add-extensions-and-capability-install`); this change only surfaces the `installable` outcome.
- The typed OPFS + Dexie persistence substrate (owned by `add-offline-and-sync`); storage is abstracted
  behind an on-device store here.
- Browsing/listing the connected source's content (`library-browse`, `book-detail`).
- Non-basic auth UIs (bearer/apiKey/oauth2); Komga uses basic auth and is the exercised path.

## Decisions

- **The prober coordinates connectors; it performs no direct network or DOM I/O.** All requests
  (reachability, per-connector probes) go through connectors using `HostBridge.http`. This keeps
  `core/dispatch` platform-neutral so the native (Kotlin) client re-expresses the same logic, and it
  keeps CORS/mixed-content a host concern rather than the prober's. *Alternative:* the prober calls
  `fetch` directly — rejected; it would bake web-only assumptions into core and duplicate the
  HostBridge's permission/transport handling.
- **Confidence-ranked, specificity-broken ordering.** Probe all installed connectors (concurrently)
  and take the highest `confidence` above a threshold; break ties toward the more **specialized**
  connector. Komga also speaks OPDS, so a first-match-wins scan would misclassify a Komga server as
  generic OPDS — confidence + specificity prevents that. The generic OPDS connector is always
  installed (bundled), so any OPDS feed always has a fallback claimant. *Alternative:* first connector
  to claim it — rejected (misclassifies Komga; order-dependent and fragile).
- **Reachability is a bounded, pre-auth probe.** Determine reachability with a short request to the
  server root (via a connector / `HostBridge.http`) under an `AbortController` timeout, before any
  credentials are entered, so the modal can show "Reachable" immediately and gate Connect. This
  distinguishes *unreachable* (network/DNS/timeout) from *reachable-but-unsupported* and from
  *auth-failed* (which only surfaces later on `connect`). *Alternative:* infer reachability from a
  failed `connect()` — rejected; slower, conflates network failure with bad credentials, and gives no
  pre-auth signal for the maket's indicator.
- **Result type reuses the registry resolution, plus an `unreachable` outcome.** A per-connector
  `Connector.probe()` returns `{ kind, confidence, capabilities }` (DESIGN §5.1). The prober aggregates
  these and maps to the registry's `Resolution<Connector>` — `ready` (installed connector claims it,
  carrying the live connector + capabilities), `installable` (a cataloged-but-not-installed connector
  matches, carrying its `PluginManifest`), or `unsupported` (reachable but unclaimed and not OPDS) —
  and adds `unreachable { reason }` for the network case. *Alternative:* a bespoke prober result type —
  rejected; it would duplicate `Resolution<Connector>` and drift from §6.2.
- **On-device-only credentials, separated from source metadata.** A connected source persists two
  records: a **source record** (`sourceId`, `connectorId`, `baseUrl`, `displayName`, `credentialRef`)
  and a **credential record** (username/secret) keyed by `sourceId`, stored in origin-scoped persistent
  storage and **never** part of any syncable payload. Credentials are only ever attached as auth
  (Basic/Bearer per `capabilities.auth`) on requests to the user's own server via `HostBridge.http`.
  The `sourceId` the flow mints is the same id the per-`(sourceId, bookId, mediaType)` progress key
  uses (`core-domain-model`). *Alternatives:* store creds inside the (syncable) source record —
  rejected; it would exfiltrate secrets across devices/servers. OS keychain — a future native concern,
  unavailable on web.
- **Native `<dialog>` for the modal.** Open with `showModal()` for top-layer rendering, automatic focus
  trapping, and Esc-to-dismiss; progressively enhance backdrop light-dismiss with `closedby="any"`
  plus a click-outside fallback for browsers that lack it (per `modern-web-guidance`). The stepper,
  chip, card, button, and status-badge primitives come from `design-system`. *Alternative:* a custom
  `div` overlay with a hand-rolled focus trap — rejected; it reinvents accessibility the platform
  provides and risks focus/scroll bugs.

## Risks / Trade-offs

- [Komga answers both OPDS and REST and is misclassified as generic OPDS] → confidence + specialized-
  over-generic tie-breaking; an integration test against Docker Komga asserts kind = komga, not opds.
- [CORS blocks the web probe even though the server is up, yielding a false "unreachable"] → CORS is a
  host concern (CLAUDE.md): the user allowlists the app origin in `KOMGA_CORS_ALLOWED_ORIGINS`; where a
  CORS/mixed-content failure is distinguishable, surface a specific hint instead of a generic
  "unreachable".
- [Credentials leaking into synced metadata] → credentials live in a separate `sourceId`-keyed record
  excluded from any sync payload; a security test asserts no secret appears in the syncable source
  record.
- [A slow or hostile URL hangs the modal] → every probe is bounded by an `AbortController` timeout; the
  prober resolves to `unreachable` rather than blocking.
- [Plaintext credentials at rest on web] → the web platform has no true secret store; mitigate with
  origin-scoped persistent storage and the explicit "Credentials stored on this device only"
  disclosure; the native client uses the OS keychain later.

## Open Questions

- Exact reachability timeout duration and retry policy — finalized in implementation against real
  servers (Docker Komga + a public OPDS feed).
- Whether the stepper auto-advances on "Reachable" or waits for an explicit action — the maket reads as
  automatic ("we detect the rest"); treated as auto-advance, validated against
  `doc/web/05-add-source-desktop.png`.
- Whether `installable` connectors are connected inline here or routed to the capability-install sheet
  (screen 07) — deferred to `add-extensions-and-capability-install`; this change only surfaces the
  outcome.
