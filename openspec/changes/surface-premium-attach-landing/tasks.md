# Tasks — surface-premium-attach-landing

## 1. Content

- [ ] 1.1 Add the original-PDF attachment to the Pro plan `features` in `content.ts` (paid capability; calm phrasing, no hype).
- [ ] 1.2 Add one FAQ item on the original-PDF attachment: what it does (feeds the tailor the full document for richer, more faithful rewriting), what it does not do (never enters grounding, never fabricates, honesty unchanged), and that it is a Pro feature.

## 2. Guards

- [ ] 2.1 Honest representation only: attach is shipped (`premium-attach`), so it MAY be advertised; framing must state it enriches generation only and never grounding (BC-HONESTY-01/02).
- [ ] 2.2 No new brand hue, no emoji, no exclamation points (BC-BRAND-01), no new em-dashes.
- [ ] 2.3 No new above-the-fold section; motion/perf unchanged (NFR-PERF-04).

## 3. Verify

- [ ] 3.1 `yarn lint` + `yarn build` + `yarn test` green.
- [ ] 3.2 `perf-audit` vs NFR-PERF-04 — blocked in sandbox (no Chrome); run in CI/local.
- [ ] 3.3 checker subagent (maker≠checker) vs PRD + DESIGN + this spec. `openspec validate` + archive pending (CLI not installed here).
