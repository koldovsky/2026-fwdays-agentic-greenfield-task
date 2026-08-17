## Why

Wizard step 1 is still a stub: users cannot choose document type or reuse data from a prior session. Without this, later steps (numbering, templates, PDF) cannot know whether to produce invoice, act, or both — and FR-04 copy-from-guid remains unavailable.

## What Changes

- Replace step 1 stub with a real form: radio choice of `invoice_act` (default), `invoice`, or `act` (FR-03)
- Persist `doc-type` on the session via the existing PATCH API when the user selects a type or advances
- Add optional copy-from-guid: load another session’s data into the current one, excluding document numbers; set `copied-from` (FR-04, BC-11)
- Keep wizard chrome (progress, Назад/Далі) unchanged; only step 1 body becomes real UI
- Scope stays invoice/act for FOP↔FOP only (BC-01); no contracts, waybills, or separate VAT invoice types

## Capabilities

### New Capabilities
- `document-type`: Step 1 — choose document type and optionally copy fields from an existing session guid (without numbers)

### Modified Capabilities
- `wizard-shell`: Step 1 content is no longer a stub; shell still hosts steps 2–7 as stubs until their capabilities land

## Impact

- UI: `app/docs/[guid]/wizard-shell.tsx` (or extracted step-1 component) — real form instead of placeholder
- Session model: already has `doc-type` and `copied-from`; may need a dedicated copy/merge helper in `lib/document-session`
- API: existing `PATCH /api/docs/[guid]` for type updates; likely `GET` of source session (or a small copy action) for FR-04
- Depends on: `wizard-shell`, `document-session` (shipped)
- Unlocks: `document-numbering` (needs to know which numbers to issue)
- Non-goals: auth, ЕДО, legal guarantees (BC-02, BC-03, BC-08); actual number generation (step 2); template/PDF behavior beyond recording type
