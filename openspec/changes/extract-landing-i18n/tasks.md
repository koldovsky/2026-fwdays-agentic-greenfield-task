# Tasks — extract-landing-i18n

## 1. Contract

- [x] 1.1 Add a `landing` block to `i18n/types.ts` `Dictionary`: text-only, collections keyed by stable ids (pillars/steps/plans/faq/checklist rows/before-after/demo), section heads + inline labels + final CTA + footer credit included. Added `SectionHeadCopy` + exported it from the barrel.

## 2. Copy

- [x] 2.1 Author the full `landing` block in `en.ts` (current copy verbatim; normalized one relocated em-dash to a colon).
- [x] 2.2 Author the full `landing` block in `ua.ts` (Ukrainian; no emoji, no exclamation points, no em-dashes). FLAGGED for native marketing-voice review before task 10 makes it visible.

## 3. Assemblers + wiring

- [x] 3.1 Convert `content.ts` const exports to `(locale)` assembler functions that merge i18n text with the local structural constants (accent/status/grounding/price/featured/hrefs).
- [x] 3.2 Thread a `locale` prop (default `"en"`) through Landing → every section; read all copy via the assemblers. Extracted the inline strings in FinalCta, Footer, and the Hero demo card.
- [x] 3.3 `StructuredData` uses the `en` assemblers (inLanguage: "en") so JSON-LD stays truthful to the rendered page.

## 4. Guards

- [x] 4.1 Font-safety: no landing call site relies on the `ua` default; each passes explicit `"en"` (BC-BRAND-01, task 10 coupling).
- [x] 4.2 No copy change, no new hue/emoji/exclamation/em-dash, no layout or section change (NFR-PERF-04 unaffected).

## 5. Verify

- [x] 5.1 `yarn lint` + `yarn build` + `yarn test` green (103 files / 641 tests). `Faq.test.tsx` sources from `faqSection("en")`; i18n parity + no-emoji tests cover the new keys.
- [ ] 5.2 `perf-audit` vs NFR-PERF-04 — blocked in sandbox (no Chrome); run in CI/local.
- [ ] 5.3 verifier + checker subagents (maker≠checker). `openspec validate` + archive pending (CLI not installed here).
