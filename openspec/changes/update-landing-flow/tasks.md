# Tasks — update-landing-flow

## 1. Content

- [x] 1.1 Add a structured `hero` object to `content.ts` (kicker, headline parts, lead, CTAs, note), rewritten problem-first / enemy-centric.
- [x] 1.2 Add a blue `info` ("coverable") row to `checklistRows`; update `checklistHeadline` + `checklistSubtext` to name the coverable state; keep counts consistent.
- [~] 1.3 Sharpen `pillars` copy — deferred: the pillars section head already carries the them-vs-us contrast; kept scope tight to avoid churn (hero carries the enemy lift).
- [x] 1.4 Update step 03 in `steps` to name the cover-letter export + saved history + export options.
- [x] 1.5 Add a FAQ item covering cover letters + saved history.

## 2. UI

- [x] 2.1 `Hero.tsx` consumes the `hero` content object; LCP element + card structure unchanged.
- [x] 2.2 Confirm `ChecklistPreview` renders the new `info` row (shared `ChecklistRow` already supports it).

## 3. Guards

- [x] 3.1 No premium PDF-attach copy (task 5 unbuilt) — honesty guard (BC-HONESTY-01).
- [x] 3.2 No new brand hue (coverable reuses `brand`), no emoji, no exclamation points (BC-BRAND-01), no new em-dashes.
- [x] 3.3 No new above-the-fold section; motion/perf unchanged.

## 4. Verify

- [x] 4.1 `yarn lint` + `yarn build` + `yarn test` green (623 tests).
- [ ] 4.2 `perf-audit` vs NFR-PERF-04 (LCP margin ~20 ms) — blocked in sandbox (no Chrome); run in CI/local.
- [ ] 4.3 checker subagent (maker≠checker) vs PRD + DESIGN + this spec, then `openspec validate` + archive.
