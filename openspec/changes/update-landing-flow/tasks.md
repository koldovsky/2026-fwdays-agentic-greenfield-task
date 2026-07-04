# Tasks — update-landing-flow

## 1. Content

- [ ] 1.1 Add a structured `hero` object to `content.ts` (kicker, headline parts, lead, CTAs, note), rewritten problem-first / enemy-centric.
- [ ] 1.2 Add a blue `info` ("coverable") row to `checklistRows`; update `checklistHeadline` + `checklistSubtext` to name the coverable state; keep counts consistent.
- [ ] 1.3 Sharpen `pillars` copy with explicit them-vs-us contrast.
- [ ] 1.4 Update step 03 in `steps` to name the cover-letter export + saved history + export options.
- [ ] 1.5 Add a FAQ item covering cover letters + saved history.

## 2. UI

- [ ] 2.1 `Hero.tsx` consumes the `hero` content object; LCP element + card structure unchanged.
- [ ] 2.2 Confirm `ChecklistPreview` renders the new `info` row (shared `ChecklistRow` already supports it).

## 3. Guards

- [ ] 3.1 No premium PDF-attach copy (task 5 unbuilt) — honesty guard (BC-HONESTY-01).
- [ ] 3.2 No new brand hue (coverable reuses `brand`), no emoji, no exclamation points (BC-BRAND-01).
- [ ] 3.3 No new above-the-fold section; motion/perf unchanged.

## 4. Verify

- [ ] 4.1 `yarn lint` + `yarn build` + `yarn test` green.
- [ ] 4.2 `perf-audit` vs NFR-PERF-04 (LCP margin ~20 ms) — blocked in sandbox (no Chrome); run in CI/local.
- [ ] 4.3 checker subagent (maker≠checker) vs PRD + DESIGN + this spec, then `openspec validate` + archive.
