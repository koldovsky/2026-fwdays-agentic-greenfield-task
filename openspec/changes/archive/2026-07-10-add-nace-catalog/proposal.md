# Proposal: add-nace-catalog

## Why

`nace-catalog` is one of the two S1 domain capabilities (parallel with
`invoice-calc`) and gates `document-render` and `form-input` — the service-row
text on the printed invoice and the service picker in the form both consume it.
The gate is unblocked (`npm run capability:check` OK). The migrated spec is a
stub — it carries only FR-NACE-01, FR-NACE-05 and BC-NACE-01 — and its data
model is factually wrong: wayfinder ticket 03(d) (resolved 2026-07-09, see
`.scratch/mvp-spec-coherence/assets/03-nace.md`) established that a NACE class
is a broad grouping, so one class code (74.12) legitimately carries many
invoice-line texts and **cannot be the catalog key**. The seed-entry
requirements FR-NACE-02/03/04 exist in `docs/requirements.md` but never made it
into the spec.

## What Changes

- **BREAKING (spec):** `FR-NACE-01` reworded — catalog entries get their own
  stable id (slug); the NACE 2.1-UA class code (`XX.XX`) becomes a
  **non-unique attribute** an entry *carries*, not the key (ticket 03(d): two
  seed entries share 74.12). Entries also carry the legacy КВЕД ДК 009:2010
  correspondence as a **data-only** field — the ЄДР still runs on КВЕД until
  NACE 2.1-UA takes force on **2027-01-01** (ticket 03(a,b)); whether/where it
  is ever displayed is wayfinder ticket 09's decision, not this change's.
- `FR-NACE-02`, `FR-NACE-03`, `FR-NACE-04` added to the spec (they exist in
  `docs/requirements.md` but vanished from the migrated spec): four seed
  entries with bilingual EN+UA line texts — 74.12 graphic design, 74.12 3D
  visualization, 74.14 specialized design, 59.12 video post-production.
  Official UA class names quoted from `docs/191_2025.pdf`.
- `FR-NACE-05` sharpened into a pure-function contract: the matcher takes user
  service text (UA or EN) and returns `matched` (single entry), `ambiguous`
  (ranked candidates), or `none`. The clarifying question itself is the
  consuming UI's job (S4 `form-input`) — this module has no UI.
- `BC-NACE-01` refined: UI and new docs show NACE 2.1-UA only; the legacy КВЕД
  field may exist as internal catalog data but is never rendered.
- New pure module `src/lib/nace/` (types, seed catalog, matcher) with Vitest
  coverage (TC-STACK-04, TC-STACK-06).

## Capabilities

### New Capabilities

(none — the capability spec already exists; this change corrects and completes it)

### Modified Capabilities

- `nace-catalog`: FR-NACE-01 remodelled (entry id as key, class code
  non-unique, legacy КВЕД carried data-only); FR-NACE-02/03/04 added (seed
  entries with bilingual texts); FR-NACE-05 sharpened (pure match result
  contract: matched / ambiguous / none); BC-NACE-01 refined (data-only КВЕД
  allowed, never in UI/docs).

## Non-goals

- No UI. The service picker (S4 `form-input`) and any clarifying-question
  dialog consume the matcher result later.
- No NACE code on the printed document — `FR-NACE-06` is **dropped** (ticket
  03(c): no legal requisite, frozen template has no placeholder). Whether the
  document subtitle varies by NACE class is ticket 09 (`document-render`).
- No full NACE 2.1-UA taxonomy (651 classes) — MVP seeds the creative-services
  subset only (4 entries), per `docs/requirements.md` out-of-scope list.
- No storage — the catalog is compiled-in typed data (TC-STACK-04); user-added
  entries are Future.
- No LLM/chat matching — the matcher is deterministic keyword scoring
  (chat input is settled as Future, `openspec/config.yaml`).

## Success criteria

- `openspec validate add-nace-catalog --strict` passes; after `/opsx:sync`,
  `openspec/specs/nace-catalog/spec.md` carries the corrected requirements.
- Vitest green: every seed entry is found by its own keywords; a text hitting
  multiple entries (e.g. «3D дизайн») returns `ambiguous` with the candidates,
  never a silent wrong pick; gibberish returns `none`; matching is
  case- and language-insensitive across the UA/EN keyword sets.
- No КВЕД/ДК 009:2010 strings in any UI-facing copy exported by the module.
- `npm run lint && npm run typecheck && npm run build` stay green (NFR-DX-01).
- Traceability: FR-NACE-01..05 and BC-NACE-01 IDs preserved in requirement
  headings.

## Impact

- `openspec/specs/nace-catalog/spec.md` (via delta + sync).
- New `src/lib/nace/` — `types.ts`, `catalog.ts`, `match.ts`, tests.
- `docs/requirements.md` — FR-NACE-01..05 status `proposed → accepted` on sync.
- `openspec/capability-map.yaml` — `nace-catalog` → `shipped` after
  implementation is verified (unblocks nothing alone; `document-render` also
  needs `invoice-calc` + `banking`).
- Test tooling: Vitest is also introduced by the pending `add-invoice-calc`
  change — whichever lands first adds the devDependency and `test` script;
  this change must not double-add it (coordination noted in design.md).
