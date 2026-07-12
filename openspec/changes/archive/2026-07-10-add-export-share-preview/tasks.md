# Tasks: add-export-share-preview

> S4b preview gate — HTML download + browser print from live preview. No PDF route.

## 1. Preflight

- [x] 1.1 Run `npm run capability:check -- --capability export-share` and confirm `document-render` + `form-input` shipped
- [x] 1.2 Invoke `.agents/skills/weg3d-fin-design` skill (post the 🎨 session banner) before touching UI files

## 2. Export helpers (framework-free)

- [x] 2.1 Create `src/lib/export/download-invoice-html.ts`: `downloadInvoiceHtml(html, invoiceNumber)` — Blob, sanitized filename `invoice-{number}.html`, object URL cleanup (design D2). Verify: `npm run typecheck`
- [x] 2.2 Create `src/lib/export/print-invoice-html.ts`: `printInvoiceHtml(html)` — hidden iframe, load html, `contentWindow.print()`, cleanup (design D3). Verify: `npm run typecheck`
- [x] 2.3 Create `src/lib/export/download-invoice-html.test.ts`: empty html throws/rejects; filename sanitization; MIME type (design D6). Verify: `npm run test`
- [x] 2.4 Create `src/lib/export/print-invoice-html.test.ts`: empty html guard; print invoked on mock contentWindow (design D6). Verify: `npm run test`

## 3. UI — export actions

- [x] 3.1 Create `src/components/invoices/invoice-export-actions.tsx`: Download HTML + Print buttons, Ukrainian labels, disabled when `!html`, WEG3D Fin outline buttons h-9 (design D4). Verify: `npm run typecheck`
- [x] 3.2 Refactor debounce: lift 150 ms debounced HTML to `NewInvoicePageContent` (or expose callback from panel) so export and iframe share settled HTML (design D5). Verify: `npm run typecheck`
- [x] 3.3 Integrate `InvoiceExportActions` into preview panel header; wire handlers to export helpers; pass preview invoice number from render context. Verify: manual at `/invoices/new`

## 4. Verification and handoff

- [x] 4.1 Manual: valid preview → download `.html` → open offline → layout intact (FR-EXPORT-02)
- [x] 4.2 Manual: valid preview → print → A4 dialog, no horizontal overflow (FR-EXPORT-03)
- [x] 4.3 Manual: empty preview / validation errors / missing IBAN → export buttons disabled (FR-EXPORT-01 scenarios)
- [x] 4.4 Confirm browser console clean on download + print happy path (NFR-OBS-01 pattern)
- [x] 4.5 Full gate: `npm run test && npm run typecheck && npm run lint && npm run build` green
- [x] 4.6 Walk `docs/capabilities/export-share.md` preview verification checklist
- [x] 4.7 Run `openspec validate add-export-share-preview --strict`
- [x] 4.8 After verification: `/opsx:sync` → mark `export-share` preview gate shipped in `capability-map.yaml`, update `docs/current-state.md`
