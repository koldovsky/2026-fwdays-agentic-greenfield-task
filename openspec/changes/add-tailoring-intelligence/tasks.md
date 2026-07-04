## 0. Product decision (do first — blocks the cover-letter half)

- [x] 0.1 RESOLVED 2026-07-04 (user): cover letter promoted into scope. PRD adds `FR-COVERLETTER-01/02` and removes "Cover letter generation" from "Out of scope (MVP)". §4/§5 of this change proceed.
- [x] 0.2 Confirm a blue/info design token exists for the `info` checklist status in `docs/vouch-design-system/` / `src/app/globals.css` `@theme`; if not, agree one with DESIGN.md before adding any hue (no new brand hues without sign-off)

## 1. Blue `info` checklist status (scoring core — MODIFIES `checklist`)

- [x] 1.1 Add `"info"` to `ChecklistStatus` in `src/shared/lib/scoring/types.ts` (fixed set becomes met · partial · info · gap · overclaim-risk) — FR-CHECKLIST-02
- [x] 1.2 In `src/shared/lib/scoring/checklist.ts`, add the deterministic `info` rule: a requirement with no grounded and no claimed-only keyword, but with adjacent CV evidence plausibly covering it, resolves to `info` instead of `gap`; keep the rule pure and deterministic — FR-CHECKLIST-01, TC-PURE-01
- [x] 1.3 Add the Ukrainian `info` rationale (≤100 chars, no emoji) framed as an improvement suggestion ("розкрийте це в супровідному листі"), naming the adjacent CV evidence — FR-CHECKLIST-03
- [x] 1.4 Add `info` to `STATUS_CREDIT` in `checklist.ts` with partial (below `partial`, above `gap`) weighted credit; keep `matchScore` in 0–100 and must-have weighted above nice-to-have — FR-CHECKLIST-04
- [x] 1.5 Unit tests: `info` triggers only on the coverable case, never on a true `gap`, never on `overclaim-risk`; determinism holds; rationale format holds; score bounds + must-have weighting hold — FR-CHECKLIST-01/02/03/04

## 2. Surface `info` in the UI

- [x] 2.1 Add an `info` `ChecklistRowStatus` (blue) to `src/shared/ui` using the confirmed token from 0.2; keep visible focus/contrast — NFR-A11Y-01, FR-CHECKLIST-02
- [x] 2.2 Map + render `info` in `src/widgets/checklist-panel` (blue "suggestion", not red "missing"); add ua + en labels in `src/shared/lib/i18n` — NFR-I18N-01
- [x] 2.3 Widget/UI tests: an `info` row renders blue with its suggestion rationale and is not styled as a `gap`

## 3. Seniority inference (NEW `cover-letter`)

- [x] 3.1 Add seniority types to `src/shared/lib/llm/types.ts` (`CareerStage = "junior" | "mid" | "senior"`, `SeniorityInput`, `SeniorityVerdict { stage, rationale }`) — BC-HONESTY-01
- [x] 3.2 Add `SENIORITY_SYSTEM_PROMPT` + `buildSeniorityPrompt` to `src/shared/lib/llm/prompts.ts`: infers stage from CV prose ONLY, forbids inventing skills/numbers/experience absent from the CV, Ukrainian rationale — BC-HONESTY-01, NFR-I18N-01
- [x] 3.3 Add `parseSeniorityResponse` (strict JSON, tolerant fail; unknown stage → `junior`, never inflate; missing rationale → typed error) — NFR-OBS-01
- [x] 3.4 Add an `infer-seniority` step to the analysis phase in `src/features/run-tailoring/lib/loop.ts`; `contextKeys` `["cvText"]` only; **best-effort/non-fatal** (records a step on success, nothing on exhaustion, so a flaky tone signal never sinks an honest run); carry the verdict on the `analysis` event + `TailoringRunResult`; tag `src/entities/tailoring` with the career stage — BC-HONESTY-01, NFR-OBS-01
- [x] 3.5 Thread the seniority stage into `buildGenerationPrompt` (tone-only block, byte-stable baseline when absent); do NOT thread it into `buildGroundingPrompt` — BC-HONESTY-01
- [x] 3.6 Assert grounding isolation: `infer-seniority`'s `contextKeys` are cvText-only; `generate-bullet` names `careerStage`, `ground-bullet` never does; trajectory `GROUNDING_ALLOWED` unchanged + explicit `GROUNDING_FORBIDDEN` denylist — FR-BULLETS-03, BC-HONESTY-03
- [ ] 3.7 **BLOCKED on `ANTHROPIC_API_KEY`.** Honesty eval (honesty-eval skill) over live prompts: weak CV never yields inflated `senior`; seniority never leaks into grounding; a fabricated seniority claim cannot make an unsupported bullet read `grounded`. Deterministic proxies shipped (loop/prompts/trajectory tests); live run pending key — BC-HONESTY-01, BC-HONESTY-03

## 4. Cover-letter generation (NEW `cover-letter`)

- [x] 4.1 Add cover-letter types to `src/shared/lib/llm/types.ts` (`CoverLetterInput` = requirements + CV sentences + confirmed answers + career stage; `CoverLetterOutput = { paragraphs }`) — FR-EXPORT-01, BC-HONESTY-01
- [x] 4.2 Add `COVER_LETTER_SYSTEM_PROMPT` + `buildCoverLetterPrompt` + tolerant `parseCoverLetterResponse` to `src/shared/lib/llm`: grounded in CV + confirmed answers only, same no-fabrication as generation, Ukrainian-first, introduces no claim the tailored bullets did not already justify. (Authored as the richer LLM path; shipped route uses the deterministic MVP per decision #6.) — BC-HONESTY-01, NFR-I18N-01
- [x] 4.3 Extend `src/entities/export-document` with an optional `coverLetter` paragraph block + plain-text render (framework-free) — FR-EXPORT-01, TC-PURE-01
- [x] 4.4 Scaffold `src/features/export-cover-letter` (lib/api + `index.ts` public API); `buildCoverLetterDocument` assembles the cover-letter `ExportDocument` from the grounded, `includedInExport` bullets, **never re-deriving overclaim exclusion** — FR-EXPORT-01, BC-HONESTY-02
- [x] 4.5 Add `src/app/api/export/cover-letter/route.ts` mirroring the pdf/docx routes: Node runtime, `currentUserId()` + `hasPaidAccess`, `402 payment_required` before any render (server-side paywall), calm coded 500 on failure — FR-PAYWALL-01, NFR-OBS-01
- [x] 4.6 Offer the cover letter in `src/widgets/export-stepper` (paywall-gated download); add ua + en copy in `src/shared/lib/i18n` — NFR-I18N-01
- [x] 4.7 Cyrillic round-trip test for the cover-letter PDF (render Ukrainian fixture → re-extract via pdf-parse → assert glyphs + footer present/absent), matching the résumé export test — FR-EXPORT-01, FR-EXPORT-04

## 5. Grounding-isolation regression guard (touches `bullets`)

- [x] 5.1 Test proving `buildGroundingPrompt`'s serialized output is byte-unchanged and carries no careerStage/cover-letter label — the grounding input type structurally has no channel for either — FR-BULLETS-03, BC-HONESTY-03
- [x] 5.2 Extend `gradeTrajectory` with an explicit `GROUNDING_FORBIDDEN` denylist (careerStage/seniority/coverLetter) atop the allow-list; adversarial fixtures for careerStage + coverLetter both trip `grounding-isolation` — BC-HONESTY-03

## 6. Verify

- [x] 6.1 verifier subagent (fresh context): `yarn lint` + `yarn build` + `yarn test` (92 files / 570 green) — **PASS**; every touched FR/NFR exercised with named-test evidence
- [x] 6.2 checker subagent (maker ≠ checker): audited the diff vs PRD IDs / DESIGN.md / FSD rules. Found 1 major — the wizard flow dropped `careerStage` at the client boundary (§3 inert in production); **fixed** (`fix(tailoring): thread careerStage through the wizard generate call`) + regression test. Grounding isolation, hues, i18n all clean.
- [x] 6.3 `docs/current-state.md` refreshed (last action + timestamp, IDs, next steps, blockers); change `openspec validate`-clean; archiving now
