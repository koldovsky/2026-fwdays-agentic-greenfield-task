## Why

Wizard step 5 is still a stub: users cannot pick or create service lines for a document. Without services, later template-fill and PDF steps have no line items or totals, and FR-11–FR-12 / TC-14 remain unmet.

## What Changes

- Replace step 5 stub with real services UI: catalog pick, create/edit lines, add multiple rows (FR-11, FR-12)
- Persist the reusable catalog at `{data-root}/jobs/services.json` with fields `sign-name`, `service-name`, and optional last `amount` / `price` hints
- Write document line snapshots onto the session `services[]` array so later PDF stays stable if the catalog changes (DESIGN.md)
- Require ≥ 1 service line with quantity and price before «Далі»; surface persistence errors (NFR-10, DESIGN step validation)
- Keep wizard chrome unchanged; only step 5 body becomes real UI; steps 6–7 remain stubs

## Capabilities

### New Capabilities
- `services-catalog`: Step 5 — services catalog and document line items (`sign-name`, `service-name`, `amount`, `price`)

### Modified Capabilities
- `wizard-shell`: Step 5 content is no longer a stub; shell still hosts steps 6–7 as stubs until their capabilities land

## Impact

- UI: services step component wired into `WizardShell` for step 5 (catalog + editable line rows + «додати ще»)
- New module: services catalog read/write under data root; session PATCH for `services` array (type `ServiceLine` already exists)
- APIs: `GET/PUT /api/jobs/services` per DESIGN.md; session fields already modeled
- Depends on: `wizard-shell` (and existing `document-session` persistence)
- Unlocks: `template-fill` (needs service lines for anchors and `price-total`)
- Non-goals: auth, ЕДО, legal guarantees (BC-02, BC-03, BC-08); template preview/PDF; amount-in-words / date helpers usage (those land in `template-fill`)
