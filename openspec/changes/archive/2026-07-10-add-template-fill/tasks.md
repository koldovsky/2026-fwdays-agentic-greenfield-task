## 1. Template fill engine

- [x] 1.1 Add `lib/template-fill`: resolve `templates/invoce.html` and `templates/complete.html` from project root; add lightweight HTML parser dependency if none exists
- [x] 1.2 Implement `computePriceTotal(services)` and session→anchor value map (contacts, numbers, dates via locale-helpers, totals, aliases including `data-cursive` → `date-cursive`, `amount` → `done_amount` / qty)
- [x] 1.3 Implement `fillInvoiceHtml` / `fillActHtml`: apply `data-prefilled` (+ class aliases), clone `.service-row` per line, set qty/price/line sum/`price-total`/`amount-cursive`
- [x] 1.4 Unit tests: TC-15 invoice anchors present; TC-16 act anchors present; TC-24 `price-total` = Σ(`amount × price`); two service lines → two rows

## 2. Preview API

- [x] 2.1 Add `GET /api/docs/[guid]/preview?type=invoice|act` returning filled `text/html` (404 missing session; 400 type not allowed by `doc-type`)
- [x] 2.2 Surface template read / fill failures as clear 5xx with message (NFR-10)

## 3. Step 6 UI

- [x] 3.1 Create `TemplateFillStep` (or `PreviewStep`) client component: sandboxed iframe(s) for invoice and/or act by `doc-type`; read-only; Ukrainian chrome labels
- [x] 3.2 On «Далі»: `PATCH` session `current-step` to 7; block and show error on save failure
- [x] 3.3 Wire into `WizardShell`: render preview UI on step 6; keep stub for step 7 only

## 4. Verification & handoff

- [x] 4.1 Manually verify TC-15, TC-16, TC-24 and doc-type filtering (invoice-only vs invoice_act); reload on step 6 keeps same `guid` and previews
- [x] 4.2 Update `docs/current-state.md` with template-fill status and next capability (`pdf-export`)
