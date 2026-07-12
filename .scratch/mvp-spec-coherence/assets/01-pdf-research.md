# 01 — Browser-side PDF generation and Cyrillic fonts

Research asset for ticket
[`01-browser-pdf-and-cyrillic-fonts`](../issues/01-browser-pdf-and-cyrillic-fonts.md).

Every claim below is either **VERIFIED** against a primary source (with the
source named) or explicitly marked **UNVERIFIED**.

---

## Part B — Fonts

### B1. Geist, Geist Mono and Inter all ship Cyrillic — VERIFIED

Two independent primary sources agree.

**Source 1 — Next.js' own bundled font manifest**
(`node_modules/next/dist/compiled/@next/font/dist/google/font-data.json`):

| Family | `subsets` |
| --- | --- |
| Geist | `cyrillic`, `latin`, `latin-ext` |
| Geist Mono | `cyrillic`, `latin`, `latin-ext` |
| Inter | `cyrillic`, `cyrillic-ext`, `greek`, `greek-ext`, `latin`, `latin-ext`, `vietnamese` |

**Source 2 — the live Google Fonts CSS2 API**
(`https://fonts.googleapis.com/css2?family=Geist:wght@400`), fetched with a
Chrome user-agent. Both Geist and Inter return `/* cyrillic */` and
`/* cyrillic-ext */` `@font-face` blocks.

The `cyrillic` subset resolves to exactly:

```
U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116
```

### B2. The `cyrillic` subset alone covers Ukrainian — VERIFIED

Every Ukrainian-specific letter falls inside that range:

| Glyph | Codepoint | Subset |
| --- | --- | --- |
| `Є` | U+0404 | `cyrillic` (inside `U+0400-045F`) |
| `І` | U+0406 | `cyrillic` |
| `Ї` | U+0407 | `cyrillic` |
| `Ґ` `ґ` | U+0490–0491 | `cyrillic` (explicit range) |

`cyrillic-ext` is **not** needed. Note, however, that the hryvnia sign `₴`
(U+20B4) lives in `cyrillic-ext`. The MVP invoices in USD and EUR only, so this
does not bite — but it would the moment UAH is added.

### B3. `№` (U+2116) is a Cyrillic-subset glyph — VERIFIED

`docs/invoice-template.html` contains exactly three classes of non-ASCII
character:

| Char | Codepoint | Subset | Count |
| --- | --- | --- | --- |
| Cyrillic letters | U+0400–045F | `cyrillic` | many |
| `—` em dash | U+2014 | `latin` | 2 |
| `№` numero sign | U+2116 | **`cyrillic`** | 2 |

This matters more than it looks. `FR-CALC-06` specifies the payment purpose as
`Payment by the invoice №{number} from {date_en}` — an *English* sentence that
nonetheless requires the Cyrillic subset. Any font strategy that loads "Latin
only because the English column is Latin" produces a tofu box in the English
text.

### B4. `subsets: ["latin"]` does **not** drop Cyrillic — VERIFIED, and it corrects a wrong assumption

`src/app/layout.tsx:6-9` configures Geist with `subsets: ["latin"]` under
`<html lang="uk">`. The obvious reading — "Cyrillic is not loaded, so Ukrainian
text renders in a fallback font" — is **wrong**.

Next.js' own documentation is vague here (`font.md:146-149` says only that
subsets are "preloaded"), so the behaviour was read from the implementation:

- `get-google-fonts-url.js` builds the Google Fonts URL from **family, axes and
  display only**. `subsets` is never part of the URL, so Google returns the
  `@font-face` rules for *every* subset.
- `find-font-files-in-css.js` walks that CSS and pushes **every** font file it
  finds into the download list. The `subsets` array only sets a boolean:
  `preloadFontFile: subsetsToPreload?.includes(currentSubset)`.

**Actual consequence.** The Cyrillic `woff2` is downloaded and self-hosted. Its
`@font-face` carries the Cyrillic `unicode-range`. It simply gets no
`<link rel="preload">`, so the browser fetches it lazily on encountering the
first Cyrillic glyph. With `display: 'swap'` the user sees Ukrainian text flash
in the fallback font and then swap to Geist.

So the defect is **a flash of unstyled Cyrillic text on every cold load**, not a
permanently wrong font. The fix is one word: `subsets: ["cyrillic", "latin"]`.

### B5. Font *format* is the real trap — VERIFIED

The moment a PDF library embeds a font, format matters, and the two obvious
sources both fail in a non-obvious way.

- **`@react-pdf/renderer` supports TTF and WOFF only.** Its documentation states
  "only TTF and WOFF fonts files are supported" (react-pdf.org/fonts). **WOFF2
  is not listed.**
- **Google Fonts CSS2 serves `woff2`** to modern user-agents — which is exactly
  what `next/font/google` self-hosts. Those files are therefore *not* directly
  usable by `@react-pdf/renderer`.
- **`@fontsource/inter@5.2.8` ships 126 `.woff` and 126 `.woff2` files, and
  zero `.ttf`** (verified via the jsDelivr package API). The `.woff` files are
  usable.

**But every Fontsource file is subset-scoped.** Verified by listing all
`-400-normal.woff` files:

```
inter-latin-400-normal.woff        inter-cyrillic-400-normal.woff
inter-latin-ext-400-normal.woff    inter-cyrillic-ext-400-normal.woff
inter-greek-400-normal.woff        inter-vietnamese-400-normal.woff
```

There is **no combined file**. And `Font.register()` in `@react-pdf/renderer`
takes one source per weight/style — it has no `unicode-range` fallback
mechanism the way CSS does.

**Therefore:** registering `inter-latin-400-normal.woff` yields a document whose
English lines render and whose Ukrainian lines are tofu — including the `№` in
the English payment-purpose line. A PDF library needs **one font file
containing both Latin and Cyrillic**, which means the full unsubsetted TTF from
the Google Fonts download or from rsms.me/inter, not the web-optimised subsets.

This is the single most likely way for the prototype to fail silently, and it is
why ticket `05` must inspect the rendered PDF rather than trust that it built.

---

## Part D — Two repo facts that reshape the question

### D1. The invoice template is authored for browser print — VERIFIED

`docs/invoice-template.html` (358 lines, 20 KB) uses:

- `display: grid` ×2 with `grid-template-columns` (`.info-grid`, `.info-row`)
- `display: flex` ×7
- an HTML `<table>` for the service rows
- `@media print { @page { size: A4; margin: 0; } }`
- `.section { page-break-inside: avoid; }`
- `-webkit-print-color-adjust: exact` on the coloured header, section headers and
  payment amounts

That is a document designed for `window.print()` and for nothing else. In
particular, **CSS grid** rules it out of `@react-pdf/renderer`, whose layout
engine implements flexbox but not grid — so "the template is the source of
truth" (`TC-STACK-03`) cannot survive a move to React-PDF primitives without
re-authoring the two `.info-grid` / `.info-row` rules.

### D2. There **is** a server. The map is wrong about this — VERIFIED

The map's settled decision 2 records "no server". That is not what the repo
says:

- `next.config.ts` sets **no `output: 'export'`** — this is not a static export.
- `src/app/api/health/route.ts` is a live Route Handler, and `FR-SHELL-03` marks
  it **shipped**.
- `TC-DEPLOY-01` deploys to Vercel, which runs Node/Edge functions.

What the human actually asked for was: *the invoice is never stored, and never
hosted behind a link*. A **stateless** serverless function that receives invoice
data, renders the HTML with headless Chromium, returns a PDF and remembers
nothing would violate neither of those. It would also make `docs/invoice-template.html`
the true source of truth, because it would be printed by a real browser engine.

This is not mine to decide — it touches a settled decision. It is raised for the
human in the ticket's answer.

---

## Part A / C / E / F / G / H — library comparison

| Option | Text | Eats our HTML/CSS? | Gives a Blob? | Bundle (gz) | Keeps TERMS block whole? |
| --- | --- | --- | --- | --- | --- |
| `window.print()` | **vector** | **yes — verbatim** | **no, dialog only** | 0 | yes (`break-inside: avoid`) |
| `paged.js` + print | **vector** | **yes — verbatim** | **no, dialog only** | ~91 KB | **best** (real `@page`) |
| `@react-pdf/renderer` | **vector** | no — own primitives, **no CSS grid, no `<table>`** | **yes** | ~471 KB | **best programmatic** (`wrap={false}`) |
| `pdf-lib` (+ fontkit) | **vector** | no — you draw rectangles | **yes** | ~178 KB | only if you hand-code it |
| `pdfmake` | **vector** | no — JSON DSL (good tables) | **yes** | ~334 KB | via `pageBreakBefore` callback |
| `jsPDF` + `html2canvas` | **raster** | partial CSS reimpl., "experimental" | yes | ~175 KB | **no — cuts mid-line** |
| `jsPDF.html()` | **raster** | same engine as above | yes | ~175 KB | **no** |
| `@pdfme/generator` | vector | no — own schema | yes | ~384 KB | manual |
| `react-pdf-html` | vector | HTML string → react-pdf subset; **no grid** | yes | + react-pdf | inherits react-pdf |
| `satori` + `resvg` | **raster** | flexbox only | yes | — | not a fit |

### Cyrillic gotchas — VERIFIED

- **`pdf-lib`**: `StandardFonts` use WinAnsi (Windows-1252), "only 218 characters
  in the Latin alphabet". Cyrillic is **impossible** with built-ins — requires
  `@pdf-lib/fontkit` plus an embedded font. Subsets via
  `embedFont(..., { subset: true })`.
- **`jsPDF`** native text API: "The 14 standard fonts … are limited to the
  ASCII-codepage. If you want to use UTF-8 you have to integrate a custom font."
- **`@react-pdf/renderer`**: defaults to Standard-14 Helvetica (Latin). Requires
  `Font.register` with a **TTF or WOFF** — see B5, **WOFF2 is not supported**.
- **`pdfmake`**: whether the bundled Roboto VFS carries Cyrillic is **UNVERIFIED**;
  pdfmake's own guidance is to "ensure that your custom font file itself actually
  supports Cyrillic characters".

### Next.js / React 19 friction

- `pdf-lib`: none. Tested in Node, Browser, Deno, React Native.
- `@react-pdf/renderer`: the worst. `PDFViewer` / `PDFDownloadLink` need
  `"use client"` and usually `dynamic(..., { ssr: false })`. Reports of App Router
  friction are widespread; the exact breaking versions are **UNVERIFIED**.
- `html2canvas` / `paged.js`: DOM-only, must be SSR-guarded.

### The Blob requirement is what does the damage — VERIFIED

`navigator.share()` accepts a `files` array of **`File` objects**, requires a
secure context and transient activation, and is *not Baseline* (MDN). A `File`
needs a `Blob`. `window.print()` produces no Blob — the user must choose
"Save as PDF" in the OS dialog.

So the requirement "one tap → the PDF lands in Telegram" is what eliminates the
two options that render our template perfectly.

---

## The crux

Three requirements, each independently reasonable, cannot all hold in a
browser-only app:

1. **Vector, selectable, searchable text** in the PDF.
2. **`docs/invoice-template.html` stays the source of truth** (`TC-STACK-03`),
   so the on-screen preview and the PDF cannot drift.
3. **The PDF is a `Blob`** the app can hand to `navigator.share()` or download
   without an OS dialog.

- `window.print()` / `paged.js` → **1 + 2**, no Blob.
- `@react-pdf/renderer` / `pdf-lib` / `pdfmake` → **1 + 3**, template re-authored.
- `jsPDF` + `html2canvas` → **2 + 3**, raster text and page cuts mid-line.

**A fourth option exists and satisfies all three, but it needs the server that
D2 shows we already have:** a stateless Vercel Route Handler that receives the
invoice data, renders `docs/invoice-template.html` with headless Chromium
(`puppeteer-core` + `@sparticuz/chromium`), returns `application/pdf`, and
stores nothing. It is the real browser engine, so grid, `@page`,
`break-inside: avoid` and `print-color-adjust` all work; the response is a Blob;
and nothing is persisted or hosted.

Whether that counts as "no server" is not a research question. It is the human's,
and it is raised in ticket `05`.

## What is lost if the template stops being the source of truth

- **The design is implemented twice.** WEG3D Fin tokens, grid/flex layout, radii
  and brand colours get hand-translated into `StyleSheet` primitives or absolute
  coordinates, and then drift from `invoice-template.html`.
- **The preview stops equalling the PDF.** Today one HTML file renders on screen
  and to paper. With a PDF library you maintain a second layout and reconcile
  them by eye.
- **Full CSS is gone.** No grid, no `@page`, no `print-color-adjust` — only the
  library's subset.
- **`{{VARIABLE}}` templating becomes dead weight**, and `BC-LEGAL-01`
  ("the TERMS block is immutable in the generated output") loses the artifact it
  was immutable *in*. Every visual change becomes a code change.
