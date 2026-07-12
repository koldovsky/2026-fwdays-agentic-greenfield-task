# Capability: `export-share`

[← Capability map](../capability.md) · **Depends on:** [document-render](document-render.md), [form-input](form-input.md) · **Unblocks:** pdf gate (S6)

| Field | Value |
| --- | --- |
| Slice | S4 preview → S6 pdf |
| Order | #5b preview, #7a pdf |
| Owner | ui |
| Gate status | preview **shipped** · pdf not_started |
| OpenSpec spec | [export-share/spec.md](../../openspec/specs/export-share/spec.md) |
| OpenSpec change | `add-export-share-preview` |

## Purpose

Surface rendered invoice to the user: preview, HTML download, print, then PDF
export and share. Two gates — ship preview before pdf.

---

## Preview gate (S4)

Ship when `document-render` + `form-input` are `shipped`.

| ID | Description | Status |
| --- | --- | --- |
| FR-EXPORT-01 | HTML preview in browser | shipped |
| FR-EXPORT-02 | Download `.html` file | shipped |
| FR-EXPORT-03 | Browser print A4 | shipped |
| BC-DEMO-01 | Core flow for 1–2 min demo video | accepted |

### Implementation scope (preview)

| Area | Path |
| --- | --- |
| Preview panel | `src/components/invoices/invoice-preview-panel.tsx` |
| Export actions | `src/components/invoices/invoice-export-actions.tsx` |
| HTML download | `src/lib/export/download-invoice-html.ts` |
| Print | `src/lib/export/print-invoice-html.ts` |

### Verification (preview)

- [x] Preview matches document-render output
- [x] Downloaded HTML opens offline with styles
- [x] Print dialog shows A4 layout

---

## PDF gate (S6)

Ship after **preview gate** is `shipped`.

| ID | Description | Status |
| --- | --- | --- |
| FR-EXPORT-04 | `POST /api/pdf` stateless PDF | proposed |
| FR-EXPORT-05 | Web Share API or download fallback | proposed |
| TC-PDF-01 | No server retention | proposed |

```bash
npm run capability:check -- --capability export-share --gate pdf
```

### Implementation scope (pdf)

| Area | Planned path |
| --- | --- |
| API route | `src/app/api/pdf/route.ts` |
| Renderer | puppeteer-core + @sparticuz/chromium |
| Template | same HTML as preview (byte-identical goal) |

### Verification (pdf)

- [ ] PDF bytes match preview content (visual/regression)
- [ ] Cyrillic renders correctly (see issue 01)
- [ ] No payload persisted after response (TC-PDF-01)
- [ ] Share fallback on desktop without Web Share API

## Done when

- HTML preview in browser (S4)
- POST /api/pdf stateless PDF (S6)
- Web Share API with download fallback
