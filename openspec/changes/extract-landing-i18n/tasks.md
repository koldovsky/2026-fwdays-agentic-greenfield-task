# Tasks — extract-landing-i18n

## 1. Contract

- [ ] 1.1 Add a `landing` block to `i18n/types.ts` `Dictionary`: text-only, collections keyed by stable ids (pillars/steps/plans/faq/checklist rows/before-after/demo), section heads + inline labels + final CTA + footer credit included.

## 2. Copy

- [ ] 2.1 Author the full `landing` block in `en.ts` (current copy verbatim).
- [ ] 2.2 Author the full `landing` block in `ua.ts` (Ukrainian; no emoji, no exclamation points, no em-dashes). Flag for native marketing-voice review.

## 3. Assemblers + wiring

- [ ] 3.1 Convert `content.ts` const exports to `(locale)` assembler functions that merge i18n text with the local structural constants (accent/status/grounding/price/featured/hrefs).
- [ ] 3.2 Thread a `locale` prop (default `"en"`) through Landing → every section; read all copy via the assemblers / `t(locale).landing`. Extract the inline strings in FinalCta, Footer, and the Hero demo card.
- [ ] 3.3 `StructuredData` uses the `en` assemblers (inLanguage: "en") so JSON-LD stays truthful to the rendered page.

## 4. Guards

- [ ] 4.1 Font-safety: no landing call site relies on the `ua` default; each passes explicit `"en"` (BC-BRAND-01, task 10 coupling).
- [ ] 4.2 No copy change, no new hue/emoji/exclamation/em-dash, no layout or section change (NFR-PERF-04 unaffected).

## 5. Verify

- [ ] 5.1 `yarn lint` + `yarn build` + `yarn test` green. Update `Faq.test.tsx` to source from the assembler; i18n parity + no-emoji tests cover the new keys.
- [ ] 5.2 `perf-audit` vs NFR-PERF-04 — blocked in sandbox (no Chrome); run in CI/local.
- [ ] 5.3 verifier + checker subagents (maker≠checker). `openspec validate` + archive pending (CLI not installed here).
