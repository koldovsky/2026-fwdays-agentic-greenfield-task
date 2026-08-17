## Why

Wizard step 7 is still a stub: filled HTML from `template-fill` is never turned into downloadable PDFs, and completed-session final review lacks «Редагувати» / PDF actions. Without this, FR-15–FR-16 / TC-17–TC-19 and the product-brief MVP happy-path (invoice+act → PDF) remain unmet.

## What Changes

- Replace step 7 stub with a read-only final view of the documents required by `doc-type`, with PDF download per document
- Add server-side HTML→PDF rendering that reuses the same filled HTML pipeline as preview (NFR-07)
- Expose `GET /api/docs/[guid]/pdf?type=invoice|act` returning a downloadable PDF
- Support «Назад» from step 7 → step 6 with session data preserved (TC-18)
- Support «Редагувати» from final review (including `completed` sessions) to re-enter the wizard flow (FR-16, TC-19)
- Mark the session completed when the user reaches the final step / finishes the flow (align with existing `document-session` resume rules for completed guids)
- Keep wizard chrome; only step 7 body and completed-session final review become real UI

## Capabilities

### New Capabilities
- `pdf-export`: Step 7 + download — read-only final view, PDF per document type, Back to step 6, Edit back into the flow (FR-15, FR-16, NFR-07, BC-12, TC-17–TC-19)

### Modified Capabilities
- `wizard-shell`: Step 7 content is no longer a stub; unfinished step 7 and completed final-review use the pdf-export UI
- `document-session`: Clarifies when `completed` becomes true and how «Редагувати» reopens an unfinished (or re-editable) flow without losing data

## Impact

- UI: final-step / final-review component in `WizardShell` (PDF download buttons, read-only previews, Edit / Back)
- New module: `lib/pdf-export/` (or equivalent) — HTML→PDF via Playwright/Puppeteer per DESIGN.md; unit/integration coverage for download path
- API: `GET /api/docs/[guid]/pdf?type=invoice|act` → `application/pdf`
- Depends on: `template-fill` filled-HTML pipeline; session `doc-type` and snapshot fields
- Closes MVP vertical: one pass «рахунок + акт» → PDF
- Non-goals: auth, ЕДО, legal guarantees (BC-02, BC-03, BC-08); inline HTML editing on step 7 (BC-12); renaming `invoce.html` (BC-07)
