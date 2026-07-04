## 0. Product decision (do first — blocks the cover-letter half)

- [x] 0.1 RESOLVED 2026-07-04 (user): cover letter promoted into scope. PRD adds `FR-COVERLETTER-01/02` and removes "Cover letter generation" from "Out of scope (MVP)". §4/§5 of this change proceed.
- [ ] 0.2 Confirm a blue/info design token exists for the `info` checklist status in `docs/vouch-design-system/` / `src/app/globals.css` `@theme`; if not, agree one with DESIGN.md before adding any hue (no new brand hues without sign-off)

## 1. Blue `info` checklist status (scoring core — MODIFIES `checklist`)

- [ ] 1.1 Add `"info"` to `ChecklistStatus` in `src/shared/lib/scoring/types.ts` (fixed set becomes met · partial · info · gap · overclaim-risk) — FR-CHECKLIST-02
- [ ] 1.2 In `src/shared/lib/scoring/checklist.ts`, add the deterministic `info` rule: a requirement with no grounded and no claimed-only keyword, but with adjacent CV evidence plausibly covering it, resolves to `info` instead of `gap`; keep the rule pure and deterministic — FR-CHECKLIST-01, TC-PURE-01
- [ ] 1.3 Add the Ukrainian `info` rationale (≤100 chars, no emoji) framed as an improvement suggestion ("розкрийте це в супровідному листі"), naming the adjacent CV evidence — FR-CHECKLIST-03
- [ ] 1.4 Add `info` to `STATUS_CREDIT` in `checklist.ts` with partial (below `partial`, above `gap`) weighted credit; keep `matchScore` in 0–100 and must-have weighted above nice-to-have — FR-CHECKLIST-04
- [ ] 1.5 Unit tests: `info` triggers only on the coverable case, never on a true `gap`, never on `overclaim-risk`; determinism holds; rationale format holds; score bounds + must-have weighting hold — FR-CHECKLIST-01/02/03/04

## 2. Surface `info` in the UI

- [ ] 2.1 Add an `info` `ChecklistRowStatus` (blue) to `src/shared/ui` using the confirmed token from 0.2; keep visible focus/contrast — NFR-A11Y-01, FR-CHECKLIST-02
- [ ] 2.2 Map + render `info` in `src/widgets/checklist-panel` (blue "suggestion", not red "missing"); add ua + en labels in `src/shared/lib/i18n` — NFR-I18N-01
- [ ] 2.3 Widget/UI tests: an `info` row renders blue with its suggestion rationale and is not styled as a `gap`

## 3. Seniority inference (NEW `cover-letter`)

- [ ] 3.1 Add seniority types to `src/shared/lib/llm/types.ts` (`CareerStage = "junior" | "mid" | "senior"`, `SeniorityInput`, `SeniorityVerdict { stage, rationale }`) — BC-HONESTY-01
- [ ] 3.2 Add `SENIORITY_SYSTEM_PROMPT` + `buildSeniorityPrompt` to `src/shared/lib/llm/prompts.ts`: infers stage from CV prose ONLY, forbids inventing skills/numbers/experience absent from the CV, Ukrainian rationale — BC-HONESTY-01, NFR-I18N-01
- [ ] 3.3 Add `parseSeniorityResponse` (strict JSON, tolerant fail like the sibling parsers) — NFR-OBS-01
- [ ] 3.4 Add an `infer-seniority` step to the analysis phase in `src/features/run-tailoring/lib/loop.ts`; its `contextKeys` are `["cvText"]` only; carry the verdict on the `analysis` event + `TailoringRunResult`; tag `src/entities/tailoring` with the career stage — BC-HONESTY-01
- [ ] 3.5 Thread the seniority stage into `buildGenerationPrompt` (tone calibration only, still no new claims); do NOT thread it into `buildGroundingPrompt` — BC-HONESTY-01
- [ ] 3.6 Assert grounding isolation: `infer-seniority`'s `contextKeys` never include jd/requirements/generation transcript; the grounding step's allowed context in `shared/lib/evals` trajectory rank stays CV+confirmedAnswers only (seniority is NOT added) — FR-BULLETS-03, BC-HONESTY-03
- [ ] 3.7 Honesty eval (honesty-eval skill): a CV with weak signal never yields an inflated `senior`; seniority text never leaks into the grounding payload; a fabricated seniority claim cannot make an unsupported bullet read `grounded` — BC-HONESTY-01, BC-HONESTY-03

## 4. Cover-letter generation (NEW `cover-letter`)

- [ ] 4.1 Add cover-letter types to `src/shared/lib/llm/types.ts` (`CoverLetterInput` = requirements + CV sentences + confirmed answers + career stage; `CoverLetterOutput`) — FR-EXPORT-01, BC-HONESTY-01
- [ ] 4.2 Add `COVER_LETTER_SYSTEM_PROMPT` + `buildCoverLetterPrompt` to `src/shared/lib/llm/prompts.ts`: grounded in CV evidence + confirmed answers only, same no-fabrication constraints as generation, Ukrainian-first, introduces no claim the tailored bullets did not already justify — BC-HONESTY-01, NFR-I18N-01
- [ ] 4.3 Extend `src/entities/export-document/model/types.ts` with an optional `coverLetter` block (kept format-agnostic, framework-free) — FR-EXPORT-01, TC-PURE-01
- [ ] 4.4 Scaffold `src/features/export-cover-letter` (fsd-scaffold) with `ui/model/api/lib` + `index.ts` public API; the `lib` builder assembles the cover-letter `ExportDocument` from grounded bullets + verdict, never re-deriving overclaim exclusion — FR-EXPORT-01, BC-HONESTY-02
- [ ] 4.5 Add `src/app/api/export/cover-letter/route.ts` mirroring the pdf/docx routes: Node runtime, resolve `currentUserId()` + `hasPaidAccess`, return `402 payment_required` before any render (server-side paywall, no client-only gate) — FR-PAYWALL-01, NFR-OBS-01
- [ ] 4.6 Offer the cover letter in `src/widgets/export-stepper` (copy/download); add ua + en copy in `src/shared/lib/i18n` — NFR-I18N-01
- [ ] 4.7 Cyrillic round-trip test for the cover-letter export (render Ukrainian fixture → re-extract → assert glyphs + footer present/absent), matching the existing wizard export tests — FR-EXPORT-01, FR-EXPORT-04

## 5. Grounding-isolation regression guard (touches `bullets`)

- [ ] 5.1 Add a test proving `buildGroundingPrompt`'s serialized output is byte-unchanged whether or not a seniority verdict and cover-letter context exist upstream — FR-BULLETS-03, BC-HONESTY-03
- [ ] 5.2 Extend the `gradeTrajectory` honesty eval so any run whose grounding step's `contextKeys` include seniority or cover-letter keys fails the isolation check — BC-HONESTY-03

## 6. Verify

- [ ] 6.1 Run the agent-verify skill: build + typecheck + lint + full test suite green; exercise FR-CHECKLIST-01/02/03/04, FR-BULLETS-01/03, FR-EXPORT-01, BC-HONESTY-01/02/03, NFR-I18N-01 with evidence
- [ ] 6.2 Run the checker-review skill (maker ≠ checker): audit the diff vs PRD IDs, DESIGN.md (no new hues, blue `info` uses an approved token), and the FSD import rules (new `features/export-cover-letter` imports only downward)
- [ ] 6.3 Update `docs/current-state.md` (last action + timestamp, working-on IDs, next steps, blockers); on completion run openspec-archive to fold the `checklist`/`bullets` deltas + new `cover-letter` spec into the baselines
