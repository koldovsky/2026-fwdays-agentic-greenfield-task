# Design: add-export-share-preview

## Context

S4 `form-input` ships on `main`: `/invoices/new` renders live HTML via
`renderInvoice` inside `InvoicePreviewPanel` (debounced iframe `srcDoc`,
`sandbox="allow-same-origin"`). The user sees the invoice but cannot download or
print it yet — that is the **preview gate** of `export-share` (S4b).

`document-render` produces self-contained HTML (embedded CSS/fonts in the string).
No server round-trip is needed for preview-gate export. PDF (`POST /api/pdf`) and
Web Share API are explicitly deferred to S6 (`add-export-share-pdf`). UI strings
are Ukrainian; invoke `weg3d-fin-design` at apply (🎨 banner).

## Goals / Non-Goals

**Goals:**

- Download and print actions on the preview surface using the **same HTML string**
  already shown in the live preview (no second render path).
- Framework-free helpers in `src/lib/export/` for Blob download and print
  orchestration (testable without React).
- Disabled export affordance when preview is empty or blocked by render errors
  (aligns with BC-UX-01 patterns from form-input).
- Filename derived from preview invoice number for demo clarity.

**Non-Goals:**

- PDF generation, `/api/pdf`, puppeteer/chromium, Web Share API.
- Invoice persistence (`invoice-registry`).
- Changing `docs/invoice-template.html` or render pipeline output shape.
- Print/PDF pixel-perfect regression suite (manual demo verification suffices
  for preview gate).

## Decisions

### D1 — Single HTML source of truth

Export helpers accept `(html: string, invoiceNumber: string)` from the parent
page's preview state — the same value passed to `InvoicePreviewPanel`. Do not
call `renderInvoice` again inside export modules.

*Why:* Guarantees download/print match live preview byte-for-byte. Avoids race
with debounced preview updates — parent passes the latest **committed** preview
HTML (post-debounce or synchronous with panel).

*Alternative considered:* Re-render on button click — rejected (duplicate work,
possible mismatch if form changed mid-click).

### D2 — HTML download via Blob + object URL

`downloadInvoiceHtml(html, invoiceNumber)` in `src/lib/export/download-invoice-html.ts`:

1. Validate non-empty `html`.
2. `new Blob([html], { type: "text/html;charset=utf-8" })`.
3. Create temporary `<a download="invoice-{number}.html">` with `URL.createObjectURL`.
4. Programmatic click, then `URL.revokeObjectURL`.

*Why:* Pure client-side; no File System Access API (broader browser support).
`renderInvoice` output is already self-contained per document-render design.

### D3 — Print via dedicated hidden iframe

`printInvoiceHtml(html)` in `src/lib/export/print-invoice-html.ts`:

1. Create or reuse a hidden iframe (not the visible preview iframe).
2. Write `html` to `iframe.contentDocument` (or `srcdoc`).
3. On `load`, call `iframe.contentWindow?.print()`.
4. Remove iframe after `afterprint` event or timeout fallback.

Visible preview iframe keeps `sandbox="allow-same-origin"` only — print dialogs
require a separate target with `allow-same-origin` (and optionally
`allow-modals` if needed on Safari).

*Alternative considered:* `window.open` + print — works but popup blockers are
more aggressive than hidden iframe.

*Alternative considered:* Print the visible preview iframe directly — rejected
because sandbox restrictions and panel chrome would pollute print output.

### D4 — `InvoiceExportActions` in preview header

New `src/components/invoices/invoice-export-actions.tsx`:

- Two `<Button variant="outline" size="sm">` actions: «Завантажити HTML»,
  «Друкувати» (icons optional: Download, Printer from lucide-react).
- Props: `html: string | null`, `invoiceNumber: string | null`, `disabledReason?`.
- `disabled={!html}` with `title` or helper text when disabled.

Mount in `InvoicePreviewPanel` header row (actions right-aligned) or in
`NewInvoicePageContent` preview column header — prefer **inside preview panel**
so export chrome stays co-located with the document surface.

Pass `invoiceNumber` from form-to-render preview number (already generated in
form-input mapper).

### D5 — Debounce alignment

Export uses the **debounced** HTML shown in the iframe (same as user sees), not
the in-flight pending state. Parent passes `debouncedHtml` equivalent — either
lift debounce to `NewInvoicePageContent` or expose `onDebouncedHtmlChange` callback
from `InvoicePreviewPanel`.

*Why:* Prevents downloading a half-updated document while user is still typing.

*Minimal approach:* Lift `html` debounce to parent so both panel and export share
one debounced value (small refactor of existing 150 ms debounce in panel).

### D6 — Tests

- `download-invoice-html.test.ts`: rejects empty html; builds correct filename;
  creates Blob with `text/html` (mock `URL.createObjectURL` / anchor click).
- `print-invoice-html.test.ts`: rejects empty html; calls `print` on iframe
  contentWindow (jsdom/happy-dom limitations — assert setup, mock print).

## Risks / Trade-offs

| Risk | Mitigation |
| --- | --- |
| Downloaded HTML offline fonts differ from in-app preview | document-render embeds fonts/CSS; verify manually once; PDF gate handles fidelity |
| Print margins vary by browser/OS | Template `@page` rules from render output; manual A4 check in Chrome/Safari |
| iframe sandbox blocks print | Use separate hidden iframe without restrictive sandbox for print target only |
| Popup/print blocked on mobile | Accept for preview gate; demo targets desktop browser; PDF S6 for share workflow |
| Debounce lag on export | Export always uses last settled preview — acceptable UX |

## Migration Plan

1. Ship helpers + component behind existing `/invoices/new` route (no feature flag).
2. No data migration — stateless client export.
3. Rollback: remove export actions component; preview unchanged.

## Open Questions

(none blocking — preview gate scope is settled)

- **Filename sanitization:** Strip `/` and unsafe chars from invoice number in
  filename (implement in D2 helper).
