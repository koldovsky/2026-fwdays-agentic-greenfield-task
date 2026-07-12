# Embedded invoice fonts

`docs/invoice-template.html` renders in three places that must look identical:
the browser preview, a saved-and-reopened HTML file, and offline headless
Chromium (PDF). A web font fetched over the network cannot satisfy all three, so
these subsets are vendored and inlined as `data:` URIs by
`scripts/sync-template.mjs` (see FR-TPL-05).

## Provenance

Typeface: **Inter**, variable, upstream version **v20** (`font-weight: 300 800`
in a single file per subset).

Fetched from Google Fonts:

```
https://fonts.googleapis.com/css2?family=Inter:wght@300..800&display=swap
```

with a desktop Chrome `User-Agent` (the API serves `woff2` only to browsers that
advertise support). Each `@font-face` in that CSS points at a
`https://fonts.gstatic.com/s/inter/v20/…woff2` file; the three we need are
committed here verbatim.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `inter-latin.woff2` | 48,432 | `c940764593d0fe5d596be327ca7558855e018039fb78509aa21921fd3644c3e4` |
| `inter-latin-ext.woff2` | 85,272 | `a28eb6d3ccb534ae0c94ca999371df024aab60b08c3c8a5720ee9e32fa0faaa2` |
| `inter-cyrillic.woff2` | 18,744 | `aebf2ab4a4ce6810d73c1ac7be7cafb4e5ec4cee2d6db5fb3e09691747ec4bd6` |

Verify with `shasum -a 256 docs/fonts/*.woff2`.

## Why these three subsets

`unicode-range` values are copied verbatim from the upstream CSS, so the browser
selects faces exactly as it would online.

| Subset | Covers | Why it is required |
| --- | --- | --- |
| `latin` | ASCII, `€` | The English half of every invoice |
| `cyrillic` | `U+0400-045F`, `U+0490-0491` (`ґ`), **`U+2116` (`№`)** | The Ukrainian half — **and the `№` sign**, which `paymentPurpose` (FR-CALC-06) emits inside an English string. An English-only invoice still needs this file. |
| `latin-ext` | Latin diacritics (`é ü ł ø`), extra currency signs | Foreign client names and addresses — the product's entire premise |

Deliberately **not** vendored: `greek`, `greek-ext`, `vietnamese`,
`cyrillic-ext`. Code points outside the three subsets fall back to the
`font-family` chain (`-apple-system`, `Segoe UI`, `sans-serif`).

## Cost

Base64 inflates the 152 KB of woff2 to ~198 KB inside `src/lib/render/template.ts`.
Accepted so that preview, saved HTML, and PDF are identical, and so that no
document containing client or supplier PII issues a third-party request.

## Weights

The variable files span `300 800`, so `font-weight: 500 / 600 / 700 / 800` all
resolve to real instances. Before this change the `@import` requested only
`300;400;500;600;700`, and `pdffonts` on `.scratch/pdf-prototype/*.pdf` showed
synthesised faces (`Inter-Regular_Bold`, `Inter-Regular_SemiBold`).

## Licence

Inter is licensed under the **SIL Open Font License 1.1** — see `OFL.txt`,
committed alongside the fonts as the licence requires. Embedding in documents is
expressly permitted. The font is not sold, renamed, or redistributed on its own.

## Updating

1. Re-fetch the CSS and the three `woff2` files (command above).
2. Replace the files here and update the version, sizes, and hashes in this table.
3. `npm run template:sync`.

`npm run template:check` runs inside `npm run build` and fails if the fonts or
the template changed without regenerating `src/lib/render/template.ts`.
