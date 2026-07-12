# Tasks: add-form-input

> S4 / M4 demo milestone — form → live HTML preview. No invoice persistence.

## 1. Preflight

- [x] 1.1 Run `npm run capability:check -- --capability form-input` and confirm all dependencies shipped
- [x] 1.2 Invoke `.agents/skills/weg3d-fin-design` skill (post the 🎨 session banner) before touching UI files

## 2. Validation and parsing (framework-free)

- [x] 2.1 Create `src/lib/validation/invoice-input.ts`: Zod schema for form fields (email, phone, currency USD|EUR, quantity, amount, prepayment 0–100, payment/execution days); export `InvoiceFormValues` via `z.infer` (design D2, TC-STACK-05). Verify: `npm run typecheck`
- [x] 2.2 Add `parseShortFormat(text)` for FR-INPUT-02 keys (`client`, `addr`, `email`, `phone`, `web`, `curr`, `service`, `qty`, `amount`, `prepay`, `pay_days`, `exec_days`); ignore unknown keys. Verify: `npm run typecheck`
- [x] 2.3 Create `src/lib/validation/invoice-input.test.ts`: valid/invalid email, phone, currency, amount, prepayment, short-format happy path and unknown-key tolerance. Verify: `npm run test`

## 3. Form-to-render mapping

- [x] 3.1 Create `src/lib/invoices/build-payment-terms-text.ts`: pure helper producing `PaymentTermsText` from percent + day counts (design D8). Verify: `npm run typecheck`
- [x] 3.2 Create `src/lib/invoices/form-to-render.ts`: `formToRenderInput(values, ctx)` → `RenderInvoiceInput` with preview invoice number, line item from NACE entry, client fields, dates (design D3). Verify: `npm run typecheck`
- [x] 3.3 Create `src/lib/invoices/form-to-render.test.ts`: mapper output renders via `renderInvoice` without placeholders; `MissingIbanError` propagates. Verify: `npm run test`

## 4. UI components

- [x] 4.1 Create `src/components/invoices/invoice-preview-panel.tsx`: debounced iframe `srcDoc` preview, `tabIndex={0}`, Ukrainian `aria-label` (design D4, NFR-A11Y-01). Verify: `npm run typecheck`
- [x] 4.2 Create `src/components/invoices/invoice-form.tsx`: react-hook-form + Zod resolver; client Combobox with prefill (design D5); NACE ambiguous/none UX (design D6); short-format paste area with apply button (design D7); BC-UX-01 field errors with examples. Verify: `npm run typecheck`
- [x] 4.3 Wire preview: on valid state + resolved NACE, call `formToRenderInput` → `renderInvoice` → `InvoicePreviewPanel`; surface banking errors inline. Verify: manual at `/invoices/new`

## 5. Page integration

- [x] 5.1 Create `src/components/invoices/new-invoice-page-content.tsx` (client): responsive two-column layout, load active supplier via `useSyncExternalStore`, empty-state CTA when no profile (design D9). Verify: `npm run typecheck`
- [x] 5.2 Update `src/app/(dashboard)/invoices/new/page.tsx` to render `NewInvoicePageContent` with Ukrainian page title. Verify: manual layout mobile + desktop

## 6. Verification and handoff

- [x] 6.1 Manual M4 walkthrough: pick client → prefill; paste short format; valid preview; invalid email shows example; ambiguous NACE prompts choice; missing IBAN shows Settings path
- [x] 6.2 Confirm browser console clean on valid preview path (NFR-OBS-01)
- [x] 6.3 Full gate: `npm run test && npm run typecheck && npm run lint && npm run build` green
- [x] 6.4 Walk `docs/capabilities/form-input.md` verification checklist
- [x] 6.5 Run `openspec validate add-form-input --strict`
- [x] 6.6 After verification: `/opsx:sync` → `form-input: shipped` in `capability-map.yaml`, update `docs/current-state.md`
