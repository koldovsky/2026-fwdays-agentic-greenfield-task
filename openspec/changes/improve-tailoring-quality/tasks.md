# Tasks — improve-tailoring-quality

> Sequencing: heuristics first (pure, unblocks everything), then the flagged
> LLM judge, then the cover letter, then the structured resume document. Each
> group ends with its own verify + independent review so a slice can ship even
> if a later group stalls. Decisions encoded: judge flag OFF by default until
> `ANTHROPIC_API_KEY` + honesty-eval fixtures pass; junior/unknown seniority
> stays strict; deterministic letter stays as fail-honest fallback.

## 1. Heuristic scoring (checklist + wizard, pure path)

> Re-grouped: slice A (alias + seniority + derive, §1.2/1.4/1.5/1.6) shipped first
> as a pure, contained honesty fix. §1.1/1.3 (CvDocument + tenure) deferred to fold
> with Group 4 (resume export, which also needs the sectioned CvDocument).

- [ ] 1.1 Extend `entities/cv-profile/lib/normalize.ts` with role/date-range parsing into a minimal sectioned `CvDocument` (roles + parsed ranges; en+ua month names, "present"/"дотепер"); pure, never throws, unparseable dates yield zero tenure. +tests (TC-PURE-01). **DEFERRED to Group 4 (shared CvDocument need).**
- [x] 1.2 `shared/lib/scoring/checklist.ts`: synonym/alias table (pure data: k8s/kubernetes, aws/amazon-web-services, node/nodejs, rest, c#, …; short/overloaded go/r/c/ai excluded) + alias-grounded coverage. **Alias matching is WORD-BOUNDARY (`containsToken`) so a short alias never collides with an unrelated word (checker blocker fixed: ts∤results, aws∤laws, ui∤build).** +8 regression tests.
- [ ] 1.3 Tenure evaluation for duration requirements. **DEFERRED to Group 4 (needs CvDocument).**
- [x] 1.4 `checklistItem(requirement, cvProfile, seniority?)`: mid/senior claimed-only skill = claimed-covered → "partial" (never "met" — that needs prose); junior/absent stay strict → "overclaim-risk". Rationale Ukrainian, <=100 chars, no emoji/exclamation/em-dash, names the claimed skill honestly (FR-CHECKLIST-03). +tests for all three stages.
- [x] 1.5 `features/run-tailoring/lib/loop.ts`: passes the inferred `careerStage` into the score step; grounding-pass context untouched (checker CONFIRMED no export/grounding coupling).
- [x] 1.6 `entities/clarifying-question/lib/derive.ts`: `ELIGIBLE_STATUSES` = `{gap}` only, must-have-first ordering kept; tests updated (partial rows produce no questions) (FR-WIZARD-02 narrowing).
- [x] 1.7 Verify slice A: lint + build + full suite green (867/869; the only 2 red are the pre-existing `ExportDataButton` jsdom `Blob.stream` env failures, not this change). Determinism + no-inflation guards cited (verifier PASS).
- [x] 1.8 Independent review (checker subagent, opus, maker != checker): confirmed relaxation cannot export an overclaiming bullet (status ≠ grounding pass), TC-PURE-01 purity, FSD rules. 1 blocker (alias substring collisions) + 1 minor (rationale length) both FIXED; regression test locks the guard.

## 2. Flagged LLM coverage judge

- [ ] 2.1 `shared/config/env.ts`: `COVERAGE_JUDGE` flag accessor, default off; on requires `ANTHROPIC_API_KEY`; non-throwing check for the loop (NFR-OBS-01).
- [ ] 2.2 `shared/lib/llm/prompts.ts`: batched coverage-judge prompt (one call per tailoring, NFR-COST-01) over CV text + requirements ONLY; parser for per-requirement `{covered|adjacent|uncovered}` verdicts with verbatim citations.
- [ ] 2.3 Deterministic scorer over cited evidence: verify each citation appears verbatim in the CV text; discard uncited/fabricated verdicts (fall through to heuristics); every upgrade off `gap` requires a surviving citation; rationale names it.
- [ ] 2.4 Loop wiring: optional judge step in the analysis phase (before score), fail-soft to the heuristic path on error/timeout; recorded context keys limited to `cvText` + `requirements`.
- [ ] 2.5 Honesty guardrails: add the judge context keys to `GROUNDING_FORBIDDEN` (`shared/lib/evals/trajectory.ts`); adversarial trace test proving a judge key in grounding context fails the eval; test that a judge `covered` verdict never unflags an `overclaim-risk` bullet (BC-HONESTY-02).
- [ ] 2.6 honesty-eval fixtures for the judge (grounded upgrade accepted, fabricated citation rejected); live run deferred until `ANTHROPIC_API_KEY` is available, deterministic proxies must be green.
- [ ] 2.7 Verify group 2: lint + build + test green; flag-off path proven identical to group 1 behavior (no LLM call recorded).
- [ ] 2.8 Independent review of group 2 (checker subagent, maker != checker): grounding isolation, score-inflation risk, FR-CHECKLIST-01 amendment scope (flagged path only).

## 3. Grounded LLM cover letter (default paid experience)

- [x] 3.1 Server generation step for the letter (loop step or dedicated route, paid-gated like `POST /api/export/cover-letter`): promote `buildCoverLetterPrompt` from dead code; inputs = CV sentences + confirmed answers (+ requirements for emphasis, careerStage for tone).
- [x] 3.2 Verification pass: separate prompt + parser sharing no context with generation (mirrors the two-pass bullet model); every claim checked against CV sentences + confirmed answers; any unverifiable claim rejects the letter.
- [x] 3.3 Fallback wiring in `features/export-cover-letter`: generation/verification failure or rejection ships the deterministic reflow letter with a calm coded surface; unverified prose can never reach the export (NFR-OBS-01).
- [x] 3.4 honesty-eval fixtures: the user's approved example letter as the quality fixture; a grounded letter that passes; an overclaiming letter that is rejected; trajectory check that letter keys stay out of bullet grounding (already denylisted, assert it).
- [x] 3.5 i18n: letter framing copy ua+en via `shared/lib/i18n`; no emoji, no exclamation points, no em-dashes in generated-copy guards.
- [x] 3.6 Verify group 3: lint + build + test green; bullet grounding lane byte-identical with and without letter generation (FR-BULLETS-03 untouched); live letter eval deferred on `ANTHROPIC_API_KEY`.
- [x] 3.7 Independent review of group 3 (checker subagent, maker != checker): never-ship-unverified rule, fallback honesty, paywall gating, NFR-PERF-02 placement (letter off the checklist critical path).

## 4. Structured resume export

- [ ] 4.1 Complete the `CvDocument` sections in `entities/cv-profile`: contact (name/email/phone/links), summary, role bullets, skills, education; omit undetected sections, never fabricate. +tests on messy CVs.
- [ ] 4.2 Extend `entities/export-document/model/types.ts` with optional structured sections (contact, summary, experience roles+dates, skills, education); framework-free (TC-PURE-01).
- [ ] 4.3 Resume builder merge: kept (`includedInExport`) bullets replace the original bullets of their source roles; untouched roles/sections pass through in the CV's original language; excluded overclaim bullets appear in no section (BC-HONESTY-02). +tests.
- [ ] 4.4 Renderers: `src/app/api/export/pdf/resume-pdf.tsx` + `src/app/api/export/docx/resume-docx.ts` + the clipboard builder render the sections consistently; flat-document fallback when no sections; PT Sans Cyrillic rendering kept; footer + 402 paywall behavior unchanged (FR-EXPORT-01/02/03/04).
- [ ] 4.5 PII guards: contact fields never added to LLM payloads (NFR-SEC-02) and never logged in plaintext (NFR-SEC-01); test asserting no contact section in recorded LLM contexts.
- [ ] 4.6 Verify group 4: lint + build + test green; format-parity test (clipboard/PDF/DOCX same sections + footer state); Cyrillic round-trip on the PDF.
- [ ] 4.7 Independent review of group 4 (checker subagent, maker != checker): honesty of the merge (grounded-only content), PII handling, renderer parity, DESIGN token rules untouched.

## 5. Final verify + review (whole change)

- [ ] 5.1 Full gate: `yarn lint` + `yarn build` + `yarn test` green across all groups; record file/test counts as evidence.
- [ ] 5.2 honesty-eval suite: all deterministic guards green (judge isolation, letter verification, export merge); note which live evals remain blocked on `ANTHROPIC_API_KEY`.
- [ ] 5.3 verifier subagent: FR-CHECKLIST-01/02/03/04, FR-WIZARD-02, FR-COVERLETTER-01/02, FR-EXPORT-01/02/03/04, FR-BULLETS-02/03 exercised with evidence; NFR-COST-01 (one judge call, two letter calls) and NFR-PERF-02 asserted.
- [ ] 5.4 checker subagent (maker != checker): whole-diff adversarial review vs PRD amendments, BC-HONESTY-01/02/03, FSD import rules, DESIGN rules; all confirmed findings fixed before handoff.
- [ ] 5.5 `openspec validate improve-tailoring-quality`; update `docs/current-state.md`; commits per group (Conventional Commits, no secrets).
