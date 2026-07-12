# 01 — Browser-side PDF generation and Cyrillic fonts

Type: research
Status: resolved
Blocked by: —

## Question

The app has no server (map, settled decision 2), so the PDF must be produced in
the browser. Establish, against primary sources, what that costs and what it
demands of the document source.

**(a) Enumerate the browser-side options.** For each of: native browser
print-to-PDF, `pdf-lib`, `@react-pdf/renderer`, `pdfmake`, `jsPDF` +
`html2canvas`, `paged.js` + print — record:

- Is the resulting text **vector and selectable**, or a raster image?
- Can it consume the existing HTML + CSS of `docs/invoice-template.html`
  directly, or must the document be re-authored in the library's own
  primitives? (This decides whether `TC-STACK-03` — "template is the source of
  truth" — can survive.)
- Bundle cost, and whether it runs fully client-side.
- Does the user get a **file** (which is what we need — settled decision 2), or
  only an OS print dialog?

**(b) Fonts — evidence, not memory.** `src/app/layout.tsx:6-9` loads Geist via
`next/font/google` with `subsets: ["latin"]`, while `src/app/layout.tsx:27`
declares `<html lang="uk">`. Separately, `docs/invoice-template.html` declares
`font-family: 'Inter'` and `BC-BRAND-01` agrees, while `Design.md:19` says the
typography is Geist. Determine:

- Does **Geist** (Google Fonts) publish a Cyrillic subset at all?
- Does **Inter** publish a Cyrillic subset?
- No `geist` package is in `package.json` — confirm the font comes from
  `next/font/google` and nowhere else.

**(c) Embedding.** For each viable PDF option from (a), how is a font embedded,
and what is the byte cost of a Cyrillic subset? A PDF that silently substitutes
a fallback font for Ukrainian text is a failure mode we must be able to detect.

## Output

A markdown summary at `.scratch/mvp-spec-coherence/assets/01-pdf-research.md`,
with a source link for every claim. Recommend a shortlist of at most two
candidates for the prototype in ticket `05`.

---

## Answer

Full evidence: [`assets/01-pdf-research.md`](../assets/01-pdf-research.md).

### The font question dissolved; a different font question replaced it

**Geist, Geist Mono and Inter all ship a `cyrillic` subset.** Verified twice —
against Next.js' own bundled manifest (`font-data.json`) and against the live
Google Fonts CSS2 API. The `cyrillic` subset resolves to
`U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116`, which covers every
Ukrainian letter including `Є`, `І`, `Ї` and `Ґ`. `cyrillic-ext` is not needed.

**`subsets: ["latin"]` does not drop Cyrillic.** Next.js' docs say only that
subsets are "preloaded", which is vague, so the behaviour was read from the
implementation. `get-google-fonts-url.js` never puts `subsets` in the Google
Fonts URL, and `find-font-files-in-css.js` downloads **every** font file the CSS
mentions — `subsets` merely sets a `preloadFontFile` boolean. The Cyrillic woff2
is self-hosted; it just isn't preloaded, so it is fetched lazily on the first
Cyrillic glyph and Ukrainian text flashes in the fallback font. The fix is one
word: `subsets: ["cyrillic", "latin"]`. Recorded for ticket `11`, which owns
fonts.

**The real trap is font *format*, and it is subtle.** `@react-pdf/renderer`
supports **TTF and WOFF only — not WOFF2**, which is exactly what Google Fonts
and `next/font` serve. `@fontsource/inter@5.2.8` ships 126 `.woff` and **zero
`.ttf`**, and every one of its files is **subset-scoped**: there is no combined
Latin+Cyrillic file. `Font.register()` takes one source per weight and has no
`unicode-range` fallback. So registering `inter-latin-400-normal.woff` produces
a PDF whose English lines render and whose Ukrainian lines are tofu — including
the `№` in `FR-CALC-06`'s *English* payment-purpose string, because `№` (U+2116)
lives in the `cyrillic` subset, not `latin`. A PDF library needs one
unsubsetted font file carrying both scripts.

### Two repo facts changed the shape of the question

**The template was authored for `window.print()` and nothing else.** It uses CSS
grid (`.info-grid`, `.info-row`), flexbox, an HTML `<table>`,
`@page { size: A4; margin: 0 }`, `.section { page-break-inside: avoid }` and
`-webkit-print-color-adjust: exact`. CSS grid alone rules the template out of
`@react-pdf/renderer`, whose layout engine implements a flexbox subset.

**There is a server.** `next.config.ts` sets no `output: 'export'`, and
`src/app/api/health/route.ts` is a live Route Handler that `FR-SHELL-03` marks
*shipped*. The map's settled decision 2 says "no server". That is factually
wrong about the repo. What the human asked for was that invoices are **never
stored and never hosted behind a link** — a constraint a stateless render
function does not violate.

### The crux

Three requirements cannot all hold **in the browser**:

1. vector, selectable text;
2. `docs/invoice-template.html` stays the source of truth (`TC-STACK-03`);
3. the PDF is a `Blob`, so `navigator.share()` can hand it to Telegram in one tap.

`window.print()` and `paged.js` give **1 + 2** but produce no Blob — only an OS
dialog (MDN: `navigator.share()` needs a `File`, which needs a `Blob`).
`@react-pdf/renderer`, `pdf-lib` and `pdfmake` give **1 + 3** but require the
document to be re-authored in their primitives. `jsPDF` + `html2canvas` gives
**2 + 3** but rasterises the text and cuts pages mid-line.

A **stateless Vercel Route Handler** running headless Chromium
(`puppeteer-core` + `@sparticuz/chromium`) satisfies all three, stores nothing,
and hosts nothing.

### Shortlist for the prototype in ticket `05`

1. **Stateless server render of the existing HTML.** Keeps `TC-STACK-03` and
   `BC-LEGAL-01` meaningful, keeps preview identical to PDF, real browser
   engine. *Risk:* it needs the human to confirm that "no server" meant "no
   stored invoices", not "no functions". Cold-start latency and the Chromium
   binary size on Vercel need measuring.
2. **`@react-pdf/renderer`.** Vector, real Blob, best page-break primitive
   (`wrap={false}` keeps the TERMS block whole). *Risk:* the template is
   re-authored (no grid, no tables), ~471 KB gz, the worst App Router / React 19
   SSR ergonomics, and the font trap above.

`pdf-lib` is the fallback if bundle size dominates — smallest mature footprint
(~178 KB gz), no SSR quirks — but it has no layout engine at all: every
coordinate, line wrap and page break is hand-coded, which is brittle for a
bilingual document with variable-length service rows.

`window.print()` remains the correct **fallback** action in every scenario, and
`paged.js` would be the outright winner if the Blob requirement were ever
dropped.

### Consequences recorded elsewhere

- Ticket `05` widened: the server option is now a candidate, and the prototype
  must inspect glyphs rather than trust a successful build.
- Ticket `11` gains the `subsets: ["cyrillic", "latin"]` fix and the
  Geist-versus-Inter question, now that both are known to carry Cyrillic.
- The map's settled decision 2 carries a factual correction. The decision itself
  is the human's and stands until they revisit it.
