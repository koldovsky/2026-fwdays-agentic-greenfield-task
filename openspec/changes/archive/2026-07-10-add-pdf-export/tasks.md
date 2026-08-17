## 1. PDF engine & dependency

- [x] 1.1 Add Playwright dependency; document/install Chromium (`npx playwright install chromium`) for local/CI
- [x] 1.2 Add `lib/pdf-export`: reuse browser singleton; `renderHtmlToPdf(html)` → A4 `Buffer` via `setContent` + `page.pdf({ format: 'A4', printBackground: true })`
- [x] 1.3 Add `buildInvoicePdf` / `buildActPdf` (or one `buildPdf(session, type)`) that calls `fillInvoiceHtml` / `fillActHtml` then `renderHtmlToPdf`
- [x] 1.4 Smoke test or unit test: filled HTML → non-empty PDF bytes; reject/guard when type not in `doc-type`

## 2. PDF API

- [x] 2.1 Add `GET /api/docs/[guid]/pdf?type=invoice|act` returning `application/pdf` with Content-Disposition filename; 404 missing session; 400 type not allowed by `doc-type`
- [x] 2.2 Surface fill / browser failures as clear 5xx with message (NFR-10)

## 3. Session completion & Edit/Back

- [x] 3.1 On step 6 «Далі»: PATCH `current-step: 7` and `completed: true` (show error on save failure)
- [x] 3.2 On final view «Назад» / «Редагувати»: PATCH `completed: false`, `current-step: 6` without clearing document fields

## 4. Step 7 / final-review UI

- [x] 4.1 Create `PdfExportStep` (or equivalent): read-only preview iframe(s) by `doc-type`, «Завантажити PDF» per document, «Редагувати»; no inline content editing
- [x] 4.2 Wire into `WizardShell` for step 7 and `completed` final review; remove stub placeholder; widen layout like step 6; «Далі» remains unavailable on step 7

## 5. Verification & handoff

- [x] 5.1 Manually verify TC-17 (PDF download A4), TC-18 (Back → step 6 data intact), TC-19 (Edit → flow), TC-03 (reopen completed → final review); doc-type filtering for PDF
- [x] 5.2 Update `docs/current-state.md` — pdf-export done; MVP vertical closed (or note remaining polish)
