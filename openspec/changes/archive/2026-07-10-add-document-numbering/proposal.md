## Why

Wizard step 2 is still a stub: users cannot set the document date or receive invoice/act numbers. Without numbering, later template-fill and PDF steps have nothing to put in document headers, and FR-05–FR-07 / TC-07–TC-10 remain unmet.

## What Changes

- Replace step 2 stub with a real form: editable document date (default today) and display of issued numbers (FR-05, FR-06)
- Issue invoice numbers as `Р-{NNNNNNN}` (7 zero-padded digits) and act numbers as sequential integers `{N}`, based on session `doc-type`
- Persist yearly counters in `./{year}/doc_number.json` under the app data root; years are independent (FR-07, NFR-06, BC-06)
- Assign numbers once per session field and keep them stable across «Назад», reload, and re-entry to step 2 (NFR-04)
- Keep wizard chrome unchanged; only step 2 body becomes real UI

## Capabilities

### New Capabilities
- `document-numbering`: Step 2 — document date, invoice/act number issuance, and per-year counter files

### Modified Capabilities
- `wizard-shell`: Step 2 content is no longer a stub; shell still hosts steps 3–7 as stubs until their capabilities land

## Impact

- UI: new step-2 component wired into `WizardShell` (date control + read-only numbers after issue)
- New module: yearly `doc_number.json` read/init/increment under data root (atomic write / lock per DESIGN.md)
- Session model: already has `date`, `invoice-number`, `act-number`; issue path writes these via existing PATCH or a dedicated assign API
- Depends on: `wizard-shell`, `document-type` (which numbers to issue from `doc-type`)
- Unlocks: `template-fill` / `pdf-export` (need stable numbers); contacts/services can proceed in parallel
- Non-goals: auth, ЕДО, legal guarantees (BC-02, BC-03, BC-08); template preview/PDF; contacts/services steps
