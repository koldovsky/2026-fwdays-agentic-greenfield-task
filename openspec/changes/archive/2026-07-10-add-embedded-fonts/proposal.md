# Proposal: add-embedded-fonts

## Why

`document-render` (PR #8) ships FR-TPL-05 as `accepted`, not `shipped`, because
`docs/invoice-template.html` loads Inter through
`@import url('https://fonts.googleapis.com/…')`. That is a **remote** font, not
a bundled one, so the rendered invoice is not self-contained. Three concrete
consequences, two of them confirmed empirically against the PDF prototypes in
`.scratch/pdf-prototype/`:

1. **Privacy.** A document holding client and supplier PII issues a third-party
   request to `fonts.googleapis.com` on every render (raised by the PR #8
   security review).
2. **Faux weights — confirmed.** `pdffonts` on the prototypes reports
   `Inter-Regular_Bold` and `Inter-Regular_SemiBold`: only Regular was fetched
   and the renderer synthesised the rest. The template's title uses
   `font-weight: 800`, a weight the `@import` never even requests.
3. **The `№` trap.** Google's `cyrillic` subset owns `U+2116 NUMERO SIGN`
   (`unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116`).
   `paymentPurpose` emits `№` inside an otherwise English string
   (FR-CALC-06), so even an English-only invoice depends on the Cyrillic file.
   Offline, that character is lost.

The prototypes *did* render Cyrillic — because the generating run had network
access. Offline headless Chromium (S6 PDF, stateless per ADR-0002) has no such
luxury, and a font fallback fails **silently**: the document still renders, just
differently. Fixing this now, before `form-input` (S4) wires the preview, keeps
the preview, the downloaded HTML, and the PDF byte-for-byte identical.

## What Changes

- Vendor three Inter **variable** woff2 subsets into `docs/fonts/`
  (`latin`, `latin-ext`, `cyrillic`), each carrying `font-weight: 300 800`,
  plus `docs/fonts/OFL.txt` and provenance (version, SHA-256, upstream URL).
- `scripts/sync-template.mjs` replaces the template's single `@import` line with
  generated `@font-face` rules whose `src` is a `data:font/woff2;base64,…` URI,
  preserving each subset's `unicode-range`. `docs/invoice-template.html` is
  otherwise untouched, so the TERMS block stays byte-identical (BC-LEGAL-01).
- The generated `src/lib/render/template.ts` therefore contains **zero external
  references**; `renderInvoice` output becomes self-contained in the strict
  sense FR-TPL-05 requires.
- `npm run template:check` (already wired into `build`) gains coverage of the
  font blocks, so a font swap without regeneration fails the build.
- Tests flip from *pinning the violation* to asserting `externalUrls.length === 0`
  and that each embedded subset is present with its `unicode-range` intact.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `document-render`: FR-TPL-05 gains a normative statement that fonts are
  embedded in the output (no network at render time, offline-identical), and a
  scenario covering the `№` / Cyrillic dependency of English-only invoices.

## Non-goals

- No template layout, TERMS, or brand changes beyond the `@import` → `@font-face`
  swap (BC-LEGAL-01, BC-BRAND-01 hold; the typeface stays Inter).
- No PDF route (`export-share`, S6) and no fix for the `Type 3` glyph embedding
  the prototypes exhibit — that is a Chromium print-path concern for wayfinder
  ticket 05; this change only guarantees the font is *available* offline.
- No subsetting by glyph coverage (would need `fonttools` in the build); we take
  Google's published subsets as-is.
- No change to the app's own UI fonts (Geist via `next/font`).

## Impact

- New: `docs/fonts/{inter-latin,inter-latin-ext,inter-cyrillic}.woff2` (151 KB
  on disk), `docs/fonts/OFL.txt`, `docs/fonts/README.md` (provenance).
- Modified: `scripts/sync-template.mjs`, generated `src/lib/render/template.ts`
  (21 KB → ~220 KB), `src/lib/render/render-invoice.test.ts`,
  `openspec/specs/document-render/spec.md`, `capability-map.yaml` is unchanged
  (status already `shipped`), `docs/requirements.md` (FR-TPL-05 → shipped),
  `docs/capabilities/document-render.md` (Known gap removed).
- **Accepted cost:** ~198 KB of base64 lands in the preview route's chunk.
  Deliberate: the invoice must look the same offline, in preview, and for the
  client. No cost on the server-side PDF path.
- Licensing: Inter is SIL OFL 1.1 — embedding is permitted; the licence text
  ships alongside the fonts, as OFL requires.

## Success criteria

- `renderInvoice(...)` output contains **no** `http://` or `https://` reference.
- Output embeds exactly three `@font-face` rules with `data:font/woff2;base64,`
  sources and the upstream `unicode-range` values.
- `№` (U+2116) is covered by the embedded `cyrillic` subset; Ukrainian `ґ`
  (U+0490-0491) likewise.
- Weights 500/600/700/800 resolve to real variable instances — no synthesised
  bold (the `font-weight: 300 800` range covers the template's `800` title).
- TERMS block still byte-identical to `docs/invoice-template.html` (BC-LEGAL-01).
- `npm run template:check` fails when a font file changes without regeneration.
- FR-TPL-05 moves from `accepted` to `shipped` in `requirements.md` and the
  capability detail doc; the Known-gap section is removed.
- `npm run typecheck && npm run lint && npm run build` pass; Vitest green.
