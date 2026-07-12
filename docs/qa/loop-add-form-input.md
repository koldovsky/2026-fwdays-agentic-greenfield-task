# Loop log: add-form-input close-out

Autonomous close-out loop for S4 `form-input` after `/opsx:apply` (19/19 tasks complete).

| Tick | Phase | Command / action | Result |
| --- | --- | --- | --- |
| 0 | apply-check | `openspec instructions apply --change add-form-input` | 19/19 done, 0 remaining |
| 0 | capability-gate | `npm run capability:check -- --capability form-input` | OK — unblocked (owner: ui) |
| 0 | files | `src/components/invoices/*.tsx` | invoice-form, preview-panel, new-invoice-page-content present |
| 1 | G4 gates | `npm run test && typecheck && lint && build` | 211 tests green; lint 0 errors (1 RHF warning); build OK |
| 2 | openspec | `openspec validate add-form-input --strict` | Change valid |
| 3 | archive | `openspec archive add-form-input --skip-specs --yes` | `2026-07-10-add-form-input` (specs already synced) |
| 4 | handoff | `docs/current-state.md` | active change = none; next = `export-share` preview |

## Summary

- **Slice:** S4 `form-input` (M4 demo milestone)
- **Apply:** 19/19 tasks (completed before loop)
- **Close-out ticks:** 4 (gates → validate → archive → handoff)
- **Tests at close:** 211 green
- **Checker:** complete — adversarial review 2026-07-10 (see **Checker findings**)

## Checker handoff (separate chat)

Run in a new Cursor chat (not this loop):

1. Review `src/components/invoices/invoice-form.tsx`, `invoice-preview-panel.tsx`, `src/lib/validation/invoice-input.ts`, `src/lib/invoices/form-to-render.ts`
2. Compare against `openspec/specs/form-input/spec.md` scenarios
3. Lenses: spec compliance, a11y (NFR-A11Y-01), BC-UX-01 error examples, NACE ambiguous-match UX
4. Log findings in a fork PR or append to this file under **Checker findings**

## Checker findings

**Date:** 2026-07-10  
**Reviewer:** Cursor checker session (maker ≠ checker)  
**Gates:** `npm run test` 211/211 · `typecheck` OK · `lint` 0 errors (1 RHF warning) · `build` OK  
**Focused tests:** `invoice-input.test.ts` 10/10 · `form-to-render.test.ts` 2/2 · `match.test.ts` (NACE) covered separately

### Verdict

**PASS WITH NOTES** — усі сценарії spec покриті кодом або unit-тестами; немає блокерів для S4. Є дрібні a11y/test-gap нотатки (low severity), ручна перевірка NFR-OBS-01 залишається на людині.

### Gates

| Command | Result |
| --- | --- |
| `npm run test` | 211 passed |
| `npm run typecheck` | OK |
| `npm run lint` | 0 errors; 1 warning — `watch()` + React Compiler incompatible-library (`invoice-form.tsx:94`) |
| `npm run build` | OK |

### Spec scenario matrix

| Scenario | Status | Evidence |
| --- | --- | --- |
| FR-INPUT-01 Complete form submission | ✅ | `formToRenderInput` + `renderInvoice` client-side; `form-to-render.test.ts` no placeholders |
| FR-INPUT-01 Required customer contact | ✅ | Zod `min(1)` on name/address/email; preview blocked when `parseInvoiceFormValues` fails or no NACE |
| FR-INPUT-02 Short format parsed | ✅ | `parseShortFormat` + `mergeShortFormatIntoForm`; test maps all keys |
| FR-INPUT-02 Unknown key ignored | ✅ | `normalizeShortFormatKey` returns null; test `ignores unknown keys` |
| FR-INPUT-04 Invalid email | ✅ | Zod `.email()` + `EMAIL_EXAMPLE`; test asserts example in message |
| FR-INPUT-04 Invalid currency | ✅ | `z.enum(["USD","EUR"])`; Select UI only offers USD/EUR; test rejects UAH |
| FR-INPUT-04 Invalid amount | ✅ | `amountSchema` + `AMOUNT_EXAMPLE`; test rejects `not-money` |
| FR-INPUT-04 Invalid quantity | ✅ | `quantitySchema` > 0; test rejects `0` |
| Client selected | ✅ code | `handleClientSelect` → `clientToInvoiceCustomerFields`; no component test |
| Manual override after prefill | ✅ code | RHF `setValue` only; `mergeShortFormatIntoForm` clears `clientId` on name override |
| NACE confident match | ✅ | `match.test.ts` + UI shows classification line |
| NACE ambiguous match | ✅ | `match.test.ts` tie → `ambiguous`; UI radio list, `naceEntryId` cleared until pick |
| NACE no match | ✅ | UI `role="alert"` + refine examples |
| Preview updates on valid state | ✅ code | debounced `renderInvoice` in `invoice-form.tsx` effect |
| Preview blocked on validation failure | ✅ code | early return when `parseInvoiceFormValues` fails; empty preview |
| Missing IBAN for currency | ✅ | `MissingIbanError` UA message + Settings link in `new-invoice-page-content.tsx`; `form-to-render.test.ts` |
| BC-UX-01 Invalid phone | ⚠️ partial | Schema has `PHONE_EXAMPLE`; test only asserts `success: false`, not example text |
| BC-UX-01 Invalid prepayment | ⚠️ partial | Schema has `PREPAY_EXAMPLE`; test only asserts `success: false`, not example text |
| NFR-A11Y-01 Labeled inputs | ⚠️ partial | `Label`+`htmlFor` on inputs; Selects linked; short-format textarea uses `aria-label` only |
| NFR-A11Y-01 Keyboard reachability | ⚠️ partial | Preview `tabIndex={0}`; errors lack `aria-describedby` / `aria-invalid` on inputs |
| NFR-OBS-01 Valid preview session | ⏳ manual | No automated browser/console check in repo |

### Findings table

| ID | Lens | Severity | Finding | Recommendation |
| --- | --- | --- | --- | --- |
| C1 | A11y | Low | `FieldError` renders `role="alert"` but inputs lack `aria-invalid` and `aria-describedby` linking to error ids | Wire RHF error state to Input `aria-invalid`; add `id` on errors + `aria-describedby` |
| C2 | A11y | Low | NACE ambiguous radios use plain `<label>` without `fieldset`/`legend` | Wrap candidate group in `<fieldset>` + `<legend>` for screen readers |
| C3 | Spec/tests | Low | Phone and prepayment BC-UX-01 tests don't assert Ukrainian example strings | Extend `invoice-input.test.ts` like email test |
| C4 | Lint | Low | React Compiler skips memo on `InvoiceForm` due to `watch()` | Accept for MVP or narrow `watch` to specific fields |
| C5 | UX/perf | Info | Double debounce: 150 ms in form effect + 150 ms in `InvoicePreviewPanel` (~300 ms lag) | Consider single debounce layer |
| C6 | Tests | Info | No component/integration tests for `InvoiceForm` / client prefill UI | Optional follow-up; logic covered at lib layer |
| C7 | Manual | Info | NFR-OBS-01 (console clean on valid preview) not verified in this session | Human smoke on `/invoices/new` with DevTools |

### Lens summary

1. **Spec** — 20/20 scenarios covered in code or tests; 2 BC-UX example assertions thin in tests only.
2. **A11y** — labels present; error association and NACE group semantics improvable (C1, C2).
3. **BC-UX-01** — runtime messages Ukrainian + examples in schema; test coverage gap on phone/prepay (C3).
4. **NACE** — ambiguous path correct; matcher tests in `match.test.ts`.
5. **Banking** — `MissingIbanError` surfaces with Settings path; message matches spec.

### Manual proof log (checker — code review only)

- [x] Gates green (211 tests)
- [x] Short format + validation + mapper unit tests
- [x] NACE ambiguous/no-match UI in `invoice-form.tsx`
- [x] Supplier empty-state + IBAN error path in page content
- [ ] Keyboard-only navigation on `/invoices/new` — **not run**
- [ ] Console clean on valid preview (NFR-OBS-01) — **not run**
