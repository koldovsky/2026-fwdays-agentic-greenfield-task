## Why

Wizard step 6 is still a stub: session data (contacts, numbers, services) is never rendered into `invoce.html` / `complete.html`, so users cannot preview filled documents and FR-13–FR-14 / TC-15–TC-16 / TC-24 remain unmet. Template fill is the last Must capability before PDF export.

## What Changes

- Replace step 6 stub with a read-only HTML preview of filled invoice and/or act templates (by `doc-type`)
- Add a server-side template-fill engine that loads `./templates/invoce.html` and `./templates/complete.html`, substitutes session values into anchors, clones service rows, and computes `price-total` = Σ(`amount × price`)
- Use existing `locale-helpers` for `amount-cursive`, `date`, and `date-cursive`
- Expose filled HTML via a preview API for the step UI (iframe / sanitized HTML); no inline editing of document content
- Keep wizard chrome unchanged; only step 6 body becomes real UI; step 7 remains a stub until `pdf-export`

## Capabilities

### New Capabilities
- `template-fill`: Step 6 — fill invoice/act HTML templates from session data and show A4 preview (FR-13, FR-14, NFR-07 visual HTML, NFR-13, BC-07, TC-15, TC-16, TC-24)

### Modified Capabilities
- `wizard-shell`: Step 6 content is no longer a stub; shell still hosts step 7 as a stub until `pdf-export`

## Impact

- UI: preview step component wired into `WizardShell` for step 6 (invoice and/or act by `doc-type`; wide: side-by-side or stacked; mobile: stacked)
- New module: `lib/template-fill/` — load templates from repo `./templates/`, fill anchors, compute totals; unit tests for mapping and `price-total`
- API: `GET /api/docs/[guid]/preview?type=invoice|act` returning filled HTML
- Depends on: `locale-helpers`, session fields from `document-numbering`, `contacts`, `services-catalog`
- Unlocks: `pdf-export` (same filled HTML pipeline)
- Non-goals: auth, ЕДО, legal guarantees (BC-02, BC-03, BC-08); PDF generation / Playwright (belongs to `pdf-export`); renaming `invoce.html` (BC-07)
