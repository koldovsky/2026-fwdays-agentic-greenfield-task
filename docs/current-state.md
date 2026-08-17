# Current state

| Field | Value |
|-------|-------|
| Last updated | 2026-07-10T21:32:00+03:00 |
| Last action | Archived `add-pdf-export`; synced delta specs to main |
| Current focus | MVP vertical closed — no active OpenSpec changes |
| Key decisions | Playwright Chromium HTML→PDF; reuse `template-fill` fill; `GET …/pdf?type=`; «Далі» from 6 sets `completed: true`; Edit/Back → step 6 + `completed: false` |
| Blockers / open questions | None |
| Relevant paths | `lib/pdf-export/`, `app/api/docs/[guid]/pdf/`, `app/docs/[guid]/pdf-export-step.tsx`, `openspec/specs/pdf-export/` |

## Shipped: `add-pdf-export` (archived)

- Main specs: new `pdf-export`; `document-session` completion/Edit requirements; `wizard-shell` stub requirement updated for real step 7 (no stubs left)
- Engine: `lib/pdf-export` — browser singleton, `renderHtmlToPdf`, `buildPdf` / invoice+act helpers
- API: `GET /api/docs/[guid]/pdf?type=invoice|act` → `application/pdf` + Content-Disposition; 404/400/5xx as specified
- UI: `PdfExportStep` on wizard step 7 + completed final review; PDF download per `doc-type`; «Назад» / «Редагувати» → step 6
- Session: step 6 «Далі» → `current-step: 7`, `completed: true`
- Deps: `playwright`; install Chromium via `npm run playwright:install` (or `npx playwright install chromium`)
- Tests: `lib/pdf-export/build.test.ts` (PDF magic bytes + doc-type guard); full suite 50 passed
- Covers FR-15–FR-16, NFR-07/10, BC-12, TC-03, TC-17–TC-19
- Archive: `openspec/changes/archive/2026-07-10-add-pdf-export/`

## Shipped: `add-template-fill` (archived)

- Main specs: new `template-fill`; `wizard-shell` stub requirement updated for real step 6 (stub only step 7)
- Engine: `lib/template-fill` — `fillInvoiceHtml` / `fillActHtml`, `computePriceTotal`, value map + row clone
- API: `GET /api/docs/[guid]/preview?type=invoice|act` → filled `text/html` (400 if type not in `doc-type`)
- UI: `TemplateFillStep` sandboxed iframes on wizard step 6; step 7 remains stub
- Tests: TC-15, TC-16, TC-24, two-row clone, doc-type filter (`lib/template-fill/fill.test.ts`)
- Covers FR-13–FR-14, NFR-07/10/12/13, BC-07, TC-15, TC-16, TC-24
- Archive: `openspec/changes/archive/2026-07-10-add-template-fill/`
- Next: `pdf-export`

## Shipped: `add-services-catalog` (archived)

- Main specs: new `services-catalog`; `wizard-shell` stub requirement updated for real step 5
- Store: `lib/services-catalog` — `readServicesCatalog` / `writeServicesCatalog` / `upsertServicesIntoCatalog` at `{data-root}/jobs/services.json`
- API: `GET/PUT /api/jobs/services`
- UI: `ServicesStep` on wizard step 5 (catalog pick, multi-row lines, «додати ще»); stubs remain for 6–7
- Covers FR-11–FR-12, NFR-10/13, TC-14
- Archive: `openspec/changes/archive/2026-07-10-add-services-catalog/`

## Shipped: `add-contacts` (archived)

- Main specs: new `contacts`; `wizard-shell` stub requirement updated for real steps 3–4
- Store: `lib/contacts` — `listContacts` / `getContact` / `putContact` under `{data-root}/contacts/{inn}.json`
- API: `GET /api/contacts?q=`, `GET/PUT /api/contacts/[inn]`
- UI: shared `ContactsStep` for steps 3 (замовник → `client`) and 4 (виконавець → `done-by`); stubs remain for 5–7
- Covers FR-08–FR-10, NFR-05/10, BC-05, TC-11–TC-13, TC-26
- Archive: `openspec/changes/archive/2026-07-10-add-contacts/`

## Shipped: `add-document-numbering` (archived)

- Main specs: new `document-numbering`; `wizard-shell` stub requirement updated for real step 2
- Yearly counter store + `issueNumbersForSession` (TC-08–TC-10, idempotent, per doc-type)
- `POST /api/docs/[guid]/issue-numbers`
- Step 2 UI wired in `WizardShell`; stubs remain for steps 3–7
- Archive: `openspec/changes/archive/2026-07-10-add-document-numbering/`

## Shipped: `add-document-type` (archived)

- Main specs: new `document-type`; `wizard-shell` stub requirement updated for real step 1
- Step 1 radios + copy-from-guid; numbers omitted on copy (BC-11)
- Archive: `openspec/changes/archive/2026-07-10-add-document-type/`

## Shipped (prior)

- `document-session`, `wizard-shell`, `locale-helpers` — see archive under `openspec/changes/archive/`
