# Design: add-embedded-fonts

## Context

`docs/invoice-template.html:8` carries one line:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
```

Everything below follows from it. Measured against Google's current Inter (v20,
variable, `font-weight: 300 800`):

| Subset | woff2 | base64 | Needed |
| --- | ---: | ---: | --- |
| `latin` | 48 KB | 64 KB | yes |
| `cyrillic` | 18 KB | 25 KB | yes — Ukrainian text **and** `№` (U+2116) |
| `latin-ext` | 85 KB | 114 KB | yes — diacritics in foreign client names |
| greek, greek-ext, vietnamese, cyrillic-ext | — | — | no |

Empirical checks on `.scratch/pdf-prototype/*.pdf` (generated with network
access): Cyrillic *did* render, so the failure is latent rather than visible
today; but `pdffonts` shows `Inter-Regular_Bold` / `Inter-Regular_SemiBold` —
synthesised weights, because the `@import` requests 300–700 while the template
uses `500, 600, 700, 800`.

## Goals / Non-Goals

**Goals:**

- Zero external references in rendered output — offline, preview, and PDF
  produce the same document.
- Real weights across 300–800 (kills faux bold at no extra byte cost, since the
  vendored files are variable).
- Keep `docs/invoice-template.html` readable and diffable; keep TERMS
  byte-identical (BC-LEGAL-01).
- Reproducible builds: no network at build time either.

**Non-Goals:**

- No glyph-level subsetting (would add `fonttools` to the toolchain).
- No fix for `Type 3` glyph embedding in Chromium's print path (ticket 05).
- No typeface change (Inter stays; BC-BRAND-01).

## Decisions

- **D1 — Vendor the woff2 files into `docs/fonts/`, do not fetch at build.**
  "Independent of the internet" must hold for the build too, otherwise the
  dependency merely moves from render time to CI time. `docs/fonts/README.md`
  records upstream URL, Inter version, and SHA-256 of each file so the vendored
  bytes are auditable.
- **D2 — The `@import` → `@font-face` swap happens in `sync-template.mjs`, not
  in the HTML doc.** Embedding 198 KB of base64 into a 358-line source document
  would make it unreadable and every future diff useless. The script performs a
  single, documented, deterministic transform: it replaces the lone `@import`
  line with the generated rules. Every other byte of the template — the TERMS
  block above all — passes through untouched, so BC-LEGAL-01's byte-identity
  test keeps working unchanged.
  Consequence: `template.ts` is no longer byte-identical to the doc, so the
  drift test changes from equality to *"regenerating from the doc + fonts
  reproduces the constant exactly"*. That is the stronger check anyway: it now
  covers the font files as well, and `npm run template:check` (already in
  `build`) fails if a font is swapped without regeneration.
- **D3 — One `@font-face` per subset, `unicode-range` copied verbatim from
  Google's CSS.** The browser then downloads nothing and selects the right
  embedded face per code point, exactly as it would online. Dropping
  `unicode-range` would work too but would make the browser parse all three
  faces for every glyph; keeping it preserves upstream semantics and documents
  *why* the Cyrillic file is mandatory for English invoices (`№`).
- **D4 — `font-display: block`, not `swap`.** With a data URI the face is
  available synchronously; `swap` exists to avoid FOIT while a network font
  loads. `block` prevents a fallback-font flash in the preview iframe and is a
  no-op for PDF. (`swap` would also be harmless — this is a deliberate, minor
  choice.)
- **D5 — Keep the existing `font-family` fallback chain**
  (`'Inter', -apple-system, …, sans-serif`). It is now a genuine last resort for
  code points outside the three subsets (e.g. Greek), rather than the primary
  path.
- **D6 — Assert absence, not size.** Tests assert `externalUrls.length === 0`
  and the presence of each subset with its `unicode-range`. A byte-size ceiling
  test would be brittle across Inter releases; the size is recorded in the docs
  instead.

## Risks / Trade-offs

- [Bundle weight] ~198 KB of base64 enters the preview route's chunk. base64 of
  already-compressed woff2 gzips poorly (~75%), so budget ~150 KB over the wire.
  → Accepted deliberately: identical documents everywhere is the requirement.
  If S4 measurements hurt, the escape hatch is a `fontMode` option on
  `renderInvoice` (app-hosted font for preview, inline for export/PDF) — but
  that reintroduces two document variants, which is what we are eliminating.
- [Font upgrades] a new Inter release means re-vendoring three files and
  regenerating. → `template:check` fails loudly; README records the exact
  provenance to reproduce.
- [Licence] Inter is SIL OFL 1.1. Embedding is expressly permitted; the licence
  text must travel with the font. → `docs/fonts/OFL.txt` is committed and
  referenced from the README. The font is not sold or renamed.
- [`latin-ext` is the expensive subset] 114 KB of the 198 KB. Dropping it would
  save more than half, at the cost of tofu for `é`, `ü`, `ł` in client names
  when offline. → Kept: foreign clients are the product's entire premise.

## Migration Plan

Regenerate `template.ts` (`npm run template:sync`), flip FR-TPL-05 to `shipped`,
remove the Known-gap section. No data migration; no runtime behaviour change
beyond the embedded fonts. Rollback = revert the commit and re-run the sync.

## Open Questions

- Ticket 05 remains open for `Type 3` glyph embedding and general PDF fidelity.
  This change removes the font *availability* variable from that investigation,
  which should make the remaining fidelity work easier to reason about.
