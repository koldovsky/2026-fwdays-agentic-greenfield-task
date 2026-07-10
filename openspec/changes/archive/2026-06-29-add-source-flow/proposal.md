## Why

**Sequencing:** change 4 of 11 (see `doc/plans/web-app-roadmap.md`). Depends on
`add-connector-komga` (host-bridge, plugin-registry, connector-komga). Unblocks `add-book-detail`.

Edda is a "self-hosted library" reader, but until a user can point it at their own server there is
nothing to read. Change 3 built the Komga connector and the registry that resolves connectors; this
change adds the two pieces that turn a pasted URL into a connected source: a generic **server prober**
(detection layer) and the **"Add a source"** modal (screen 05). The prober is deliberately
connector-agnostic — it asks each installed connector "is this yours?", falls back to the installable
catalog, and ultimately to the always-available generic OPDS connector — so the same flow onboards a
rich Komga server and a bare OPDS feed without special-casing either in the UI. This realizes the
"Add a server / prober" flow in `DESIGN.md` §8.2 and the resolution model (`ready | installable |
unsupported`) in §6.2.

## What Changes

- Add a **server prober** (`core/dispatch`): given a URL it determines reachability, runs each
  installed connector's `probe(url)`, picks the highest-confidence match, falls back to the available
  catalog (an installable suggestion) and finally to the generic OPDS connector as the always-available
  fallback, and returns the detected server **kind** plus its **advertised capabilities**. It maps to
  the registry's `Resolution<Connector>` (`ready | installable | unsupported`) and adds an
  `unreachable` outcome. The prober performs no direct network or DOM I/O — it coordinates connectors,
  which use the `HostBridge` — so the native client can re-express it (conformance-tested).
- Add the **"Add a source" modal** (screen 05) exactly as in `doc/web/05-add-source-desktop.png`:
  subtitle "Connect a server or paste an OPDS feed — we detect the rest."; a 3-step stepper
  (1 Address · 2 Detected · 3 Sign in); a SERVER ADDRESS field with a live reachability check
  ("Reachable"); a detected-server card ("Komga server", monospace `connector.komga`, "bundled",
  "opds v2 + rest", "Adapter ready"); a CAPABILITIES chip row (OPDS v2 · Progress sync · Search ·
  Page streaming · Thumbnails); USERNAME / PASSWORD fields; the footer "Credentials stored on this
  device only"; and Cancel / Connect.
- On **Connect**: credentials are stored **on this device only** (never sent to Edda or any third
  party — only ever attached as auth to the user's own server), the source is persisted, and it then
  appears in the sidebar **Sources** region (cross-references the `app-shell` capability).
- Cover the **bare-OPDS-fallback** path (generic OPDS connector) and the **unreachable** path, and
  integration-test the happy path against the throwaway Docker Komga (`test/komga`).

## Capabilities

### New Capabilities

- `server-prober`: connector-agnostic URL detection — reachability + confidence-ranked probing across
  installed connectors, catalog fallback, and the always-available generic OPDS fallback, returning
  the detected server kind and its advertised capabilities.
- `add-source`: the "Add a source" modal (screen 05) — address → reachability → detected card +
  capabilities → sign-in → Connect, persisting the source on-device and surfacing it in the sidebar.

### Modified Capabilities

- None (greenfield).

## Impact

- Code: `src/core/dispatch/server-prober.ts` (prober); `src/app/components/add-source/` (the modal,
  stepper-driven); a sources store + an on-device credential store (e.g. `src/app/stores/sources.ts`);
  sidebar Sources-region wiring (cross-ref `app-shell`).
- Depends on `add-connector-komga`: `PluginRegistry` (`installed`/`available`/`resolveConnector`/
  `install`), `Connector.probe`/`connect`, `ConnectorConfig`, `Session`, and `HostBridge.http`.
- References `connector-opds` (the generic always-available fallback, owned by
  `add-extensions-and-capability-install`) and `core-domain-model` (the `(sourceId, …)` progress key
  a new source mints). Eventual typed persistence substrate (OPFS + Dexie) is owned by
  `add-offline-and-sync`; this change keeps storage abstract behind an on-device store.
- No `core/contracts` shape changes beyond the additive prober in `core/dispatch`; no format/renderer
  changes. CORS remains a host concern (the user allowlists the app origin in their server).
