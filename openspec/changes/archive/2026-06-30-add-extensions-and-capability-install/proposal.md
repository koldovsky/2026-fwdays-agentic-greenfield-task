## Why

**Sequencing:** change 10 of 11 (see `doc/plans/web-app-roadmap.md`). Depends on
`add-offline-and-sync` (raw-file download + OPFS offline path), and references the
`plugin-registry`/`host-bridge` from `add-connector-komga`, the `server-prober` from
`add-source-flow`, and `core-domain-model` from `add-library-browse`. Unblocks
`add-visual-polish-e2e`.

Edda's whole point is being **pluggable**: connectors talk to servers, formats open books, and the
app stays small by shipping only a few bundled plugins and installing the rest **on demand**. Two
maket screens make that model visible and must be built to spec: the **Extensions** registry screen
(`doc/web/06-extensions-desktop.png`) and the **Capability missing** install prompt
(`doc/web/07-capability-missing-desktop.png`). This change wires the runtime that drives both —
opening a book whose format isn't installed must detect the gap, offer a first-party install, and
**retry the open automatically** — plus the always-on **OPDS** fallback connector and the first
**install-on-demand** format (**PDF**) that the prompt installs.

Per ADR-010 and `DESIGN.md` §11, every plugin is **first-party and sandboxed**: "installing" is a
native dynamic `import()` of a lazy first-party chunk plus persisting the enabled id — never
downloading remote code.

## What Changes

- Add a **capability dispatcher**: it sniffs a resource's media type, asks the registry to resolve a
  format/connector, and produces a `ready | installable | unsupported` status. On `installable` it
  emits a **CapabilityMissing** event (Observer) that drives the install prompt; after a successful
  install it **retries the open automatically**; on `unsupported` it degrades gracefully by offering
  the raw file download (`DESIGN.md` §8.1).
- Add the **Extensions screen** (`doc/web/06`): an INSTALLED list (OPDS, Komga, EPUB — all BUNDLED,
  each with capability chips and an enable toggle), an AVAILABLE catalog (PDF "NEXT UP", Kavita,
  Calibre, CBZ — each with size and an Install action), a "Host API v1.2" pill, and the
  "First-party & sandboxed" assurance footer. Installing = first-party dynamic `import()` + persist;
  toggles enable/disable.
- Add the **capability-missing modal** (`doc/web/07`): "Install PDF support?" with the plugin card,
  capability chips, "No network access" / "Runs sandboxed" badges, a primary "Install & open", and a
  secondary "Not now — download the file instead".
- Add **`connector.opds`**: the generic OPDS 1/2 fallback connector (bundled, always-available),
  composing the shared `_opds-core`; browse + download, and progress sync **only if** the server
  advertises OPDS v2 progression (otherwise `progressSync: false`, local-only).
- Add **`format.pdf`**: the install-on-demand PDF format (pdfjs-dist) — sniff `%PDF`/`.pdf`, parse a
  fixed-layout `Publication`, page-based locators, range streaming — the target the prompt installs.

## Capabilities

### New Capabilities

- `capability-dispatch`: detect a resource's format/connector, resolve it to
  `ready | installable | unsupported`, emit CapabilityMissing on a gap, retry the open after install,
  and degrade to raw download when unsupported.
- `extensions-registry`: the Extensions screen — render installed/available first-party plugins,
  install on demand (dynamic import + persist), and enable/disable, matched to `doc/web/06`.
- `connector-opds`: the generic OPDS 1/2 fallback connector — browse, download, and honest
  per-server progress capability — composing `_opds-core`.
- `format-pdf`: the installable-on-demand PDF format handler — sniff, parse, page locators, range
  streaming — enough to demonstrate install→open.

### Modified Capabilities

- None (greenfield).

## Impact

- Code: `src/core/dispatch/` (Capability Dispatcher + CapabilityMissing event), `src/core/sniff/`
  (media-type sniffer), `src/plugins/connectors/opds/` and `src/plugins/connectors/_opds-core/`
  (shared OPDS utilities), `src/plugins/formats/pdf/` (lazy first-party chunk; new `pdfjs-dist`
  dependency), `src/app/views/SettingsExtensions.vue` (screen 06), and a `CapabilityMissingModal`
  component (screen 07).
- Build: a code-split chunk per installable format so `format.pdf` (and the EPUB/Readium bundle) stay
  out of the initial download; catalog manifests for Kavita/Calibre/CBZ (rendered as AVAILABLE; their
  runtimes land in later changes).
- Uses (does not modify): `plugin-registry` + `host-bridge` (`add-connector-komga`) for
  resolve/install/persist and the plugin contract; `server-prober` (`add-source-flow`) for which the
  OPDS connector is the fallback; `offline-storage`/`sync-engine` (`add-offline-and-sync`) for the
  raw-download and OPFS range paths; `core-domain-model` (`Locator`/`Publication`/`BookRef`).
