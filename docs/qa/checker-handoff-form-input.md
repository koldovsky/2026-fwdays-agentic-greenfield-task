# Checker handoff: S4 `form-input` (maker ≠ checker)

**Status:** complete — PASS WITH NOTES (see `docs/qa/loop-add-form-input.md` → Checker findings).

## Scope

Review implementation against `openspec/specs/form-input/spec.md`:

| File | Focus |
| --- | --- |
| `src/components/invoices/invoice-form.tsx` | FR-INPUT-01/02/04, NACE UX, BC-UX-01, a11y |
| `src/components/invoices/invoice-preview-panel.tsx` | NFR-A11Y-01, debounced preview |
| `src/components/invoices/new-invoice-page-content.tsx` | supplier empty-state, layout |
| `src/lib/validation/invoice-input.ts` | Zod schema, `parseShortFormat` |
| `src/lib/invoices/form-to-render.ts` | mapper → `renderInvoice` |

## Lenses

1. **Spec** — every scenario in `form-input/spec.md` has test or manual proof
2. **A11y** — labels, `htmlFor`, keyboard to preview (`tabIndex={0}`)
3. **BC-UX-01** — invalid email/phone/prepay show Ukrainian error + example
4. **NACE** — ambiguous match prompts choice; no silent first-wins
5. **Banking** — `MissingIbanError` surfaces Settings path

## Commands before review

```bash
npm run test && npm run typecheck && npm run lint && npm run build
```

## Output

Append findings to `docs/qa/loop-add-form-input.md` under **Checker findings**, or open a small fork PR with fixes.

## Loop context

Apply + close-out completed in 4 ticks — see [loop-add-form-input.md](./loop-add-form-input.md).
