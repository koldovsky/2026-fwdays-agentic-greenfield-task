# Tasks: add-embedded-fonts

## 1. Vendor the fonts

- [x] 1.1 Commit `docs/fonts/inter-{latin,latin-ext,cyrillic}.woff2` (Inter v20,
  variable, `font-weight: 300 800`) and `docs/fonts/OFL.txt` (SIL OFL 1.1)
- [x] 1.2 Add `docs/fonts/README.md` with upstream URL, Inter version, each
  file's SHA-256, its `unicode-range`, and why `cyrillic` is mandatory for
  English-only invoices (`№` U+2116)

## 2. Generation transform

- [x] 2.1 `scripts/sync-template.mjs`: define the three subsets with their
  `unicode-range`; read each woff2, base64-encode, emit `@font-face` rules
  (`font-family: 'Inter'`, `font-weight: 300 800`, `font-display: block`,
  `src: url(data:font/woff2;base64,…) format('woff2')`)
- [x] 2.2 Replace the single `@import` line in the template with the generated
  rules; assert the `@import` was found (fail loudly if the template changed) and
  that no other byte is altered
- [x] 2.3 `--check` mode compares the regenerated constant with `template.ts`, so
  a font swap or template edit without `template:sync` fails `npm run build`

## 3. Regenerate + tests

- [x] 3.1 `npm run template:sync`; confirm `template.ts` contains three
  `data:font/woff2;base64,` sources and no `https://`
- [x] 3.2 `render-invoice.test.ts`: flip the pinned-violation test to
  `expect(externalUrls).toHaveLength(0)` (FR-TPL-05); assert three `@font-face`
  rules, each `unicode-range` preserved, and that the Cyrillic range covers
  `U+2116`
- [x] 3.3 `fill-template.test.ts`: drift test now asserts *regeneration
  reproduces the constant* (doc + fonts), not raw byte equality with the doc
- [x] 3.4 Assert TERMS block still byte-identical to the doc (BC-LEGAL-01
  unaffected by the transform)

## 4. Spec + docs

- [x] 4.1 Sync the delta into `openspec/specs/document-render/spec.md`
  (FR-TPL-05 with the four scenarios); `openspec validate --strict` passes
- [x] 4.2 `docs/requirements.md`: FR-TPL-05 `accepted` → `shipped`
- [x] 4.3 `docs/capabilities/document-render.md`: remove the Known-gap section,
  check the external-dependency box, record the size cost and the licence
- [x] 4.4 Note in the wayfinder-05 blocker that font availability is now solved
  and `Type 3` glyph embedding remains open. Done directly on `main`
  (`docs/current-state.md`, commit `c0069d1`), not in this branch — the handoff
  file is shared across the PR stack and would conflict on every rebase.

## 5. Ship

- [x] 5.1 `npm run typecheck && npm run lint && npm run build` (build now runs
  `template:check`) and `npx vitest run` all green
- [x] 5.2 Open PR stacked on `feat/document-render`; adversarial review
  (code + security) before merge
