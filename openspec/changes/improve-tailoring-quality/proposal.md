# Improve tailoring quality

## Why

The tailoring loop is honest but blunt. Five grounded root causes, all traced to
code, make real candidates score and export worse than their CV justifies:

- **Scoring is verbatim.** `src/shared/lib/scoring/checklist.ts` (status rule
  lines 82-117, credit table 149-157) matches requirement keywords by
  case-insensitive substring only, requires every keyword grounded for `met`
  (AND-aggregation), and gives 0 credit to `gap`/`overclaim-risk`. Duration
  requirements ("3+ years of X") can never match because `normalizeCvText`
  (`src/entities/cv-profile/lib/normalize.ts:26-45`) extracts no roles, dates,
  or tenure. The score punishes phrasing, not dishonesty, undercutting
  FR-CHECKLIST-01/02/04.
- **Seniority is inferred, then ignored by scoring.** The `careerStage` from
  `src/features/run-tailoring/lib/loop.ts:257-270` threads only into generation
  tone; `checklistItem` and `derive.ts` never see it. A senior whose skills list
  says "Kubernetes" scores `overclaim-risk` (0 credit) exactly like a junior's
  bare claim.
- **Clarifying questions over-ask.** `src/entities/clarifying-question/lib/derive.ts:20-23`
  makes `partial` rows eligible; those rows already carry grounded evidence, so
  questions about them add friction without honesty value (FR-WIZARD-02).
- **The paid cover letter is a bullet reflow.** The live path
  (`src/features/export-cover-letter/lib/build-document.ts:28-50`) concatenates
  kept bullets between greeting/closing lines; the grounded
  `buildCoverLetterPrompt` (`src/shared/lib/llm/prompts.ts:268-289`) is dead
  code. The result reads like a list, not a letter (FR-COVERLETTER-01/02).
- **The resume export is a bullet dump.** `ExportDocument`
  (`src/entities/export-document/model/types.ts:17-26`) is
  headline+bullets+footer; `src/app/api/export/pdf/resume-pdf.tsx` and the docx
  renderer print bullets with no contact, roles, dates, skills, or education
  (FR-EXPORT-01/02/03).

## What Changes

- **Heuristic scoring upgrade (default path, stays pure, TC-PURE-01).**
  `normalizeCvText` grows into a sectioned `CvDocument` (roles with parsed date
  ranges); tenure is summed deterministically so duration requirements can be
  satisfied; a synonym/alias table broadens keyword coverage; `careerStage`
  threads into `checklistItem`. For `mid`/`senior`, skills-list-only evidence
  counts as covered instead of `overclaim-risk`; `junior` keeps the strict
  claimed-only rule and unknown seniority defaults strict. The all-keywords AND
  softens by broadening what counts as a covered keyword, never by crediting an
  uncovered one (FR-CHECKLIST-01/02/03/04, BC-HONESTY-01/02).
- **LLM coverage judge behind a feature flag, default off.** One batched call
  judging per-requirement coverage (`covered` / `adjacent` / `uncovered`) with
  cited CV evidence, seeing CV text and requirements only. The scorer stays
  deterministic over that cited evidence; the judge never touches the bullet
  grounding pass (its context keys join the `GROUNDING_FORBIDDEN` denylist in
  `src/shared/lib/evals/trajectory.ts:33`). The flag stays off until
  `ANTHROPIC_API_KEY` is available and honesty-eval fixtures pass
  (FR-CHECKLIST-01, BC-HONESTY-01, NFR-COST-01, NFR-PERF-02).
- **Clarifying questions narrow to true gaps.** `ELIGIBLE_STATUSES` becomes
  `{gap}` only, must-have first, bound unchanged (FR-WIZARD-02).
- **Cover letter becomes a real letter.** The grounded LLM path
  (`buildCoverLetterPrompt`) is promoted to the default paid experience via a
  new server generation step, with its own grounding verification: every claim
  is verified against the CV sentences and confirmed answers, and unverified
  prose never ships. The deterministic reflow stays as the fail-honest fallback
  (FR-COVERLETTER-01/02, BC-HONESTY-01/02, NFR-OBS-01, NFR-I18N-01).
- **Resume export becomes a structured document.** `ExportDocument` gains
  sections (contact, summary, experience with roles+dates, skills, education);
  kept tailored bullets merge into their roles; the pdf/docx/clipboard renderers
  render the structure. Exports carry only grounded, kept content; untouched
  sections keep the CV's original language (FR-EXPORT-01/02/03/04,
  FR-BULLETS-02, BC-HONESTY-02).

### PRD amendments (called out explicitly)

- **FR-CHECKLIST-01** is relaxed for the flagged judge path only: from "pure
  function" to "deterministic scorer over LLM-cited, CV-grounded evidence". The
  default path remains fully pure (TC-PURE-01).
- **FR-WIZARD-02** narrows question eligibility from `partial` or `gap` to
  `gap` only; the bound and the deterministic template are unchanged.

## Capabilities

### Added Capabilities

- `resume-export`: the structured export document, its sectioned `CvDocument`
  source, the kept-bullets-into-roles merge, and the honesty rules for what an
  export may contain.

### Modified Capabilities

- `checklist`: seniority-aware, tenure-aware, alias-aware deterministic scoring
  (default), plus the flagged LLM coverage judge whose cited evidence a
  deterministic scorer consumes; grounding-pass isolation guaranteed.
- `wizard`: clarifying-question eligibility narrows to `gap` rows only,
  must-have first.
- `cover-letter`: the grounded LLM letter becomes the default paid experience
  with its own claim verification; the deterministic reflow becomes the
  fail-honest fallback.

## Impact

- `src/shared/lib/scoring/checklist.ts` (careerStage param, coverage
  broadening, tenure check, alias table) and `src/entities/cv-profile/lib/normalize.ts`
  (sectioned `CvDocument`: contact, summary, roles+dates, skills, education).
- `src/entities/clarifying-question/lib/derive.ts` (`ELIGIBLE_STATUSES`).
- `src/features/run-tailoring/lib/loop.ts` (thread careerStage into score; new
  optional cover-letter generation + verification steps; flagged judge step).
- `src/shared/lib/llm/prompts.ts` (coverage-judge prompt; cover-letter
  verification prompt), `src/shared/lib/evals/trajectory.ts`
  (`GROUNDING_FORBIDDEN` extension + judge/letter isolation checks),
  `src/shared/config/env.ts` (judge feature flag).
- `src/features/export-cover-letter` (LLM letter default, fallback wiring),
  `src/entities/export-document/model/types.ts` (sections),
  `src/app/api/export/pdf/resume-pdf.tsx`, `src/app/api/export/docx/resume-docx.ts`,
  the clipboard builder in `features/export-resume`.
- **NFR-COST-01:** the judge is one batched call per tailoring (never
  per-requirement) and the letter is one generation + one verification call,
  all inside the existing per-request token budget.
- **NFR-PERF-02:** the added analysis-phase judge call (flagged) and the
  end-of-flow letter calls must keep the full result under 30 s p95; the letter
  runs at the Export step, off the checklist critical path.
- **NFR-SEC-02 / NFR-SEC-01:** contact PII lands in the user's own export only;
  it is never added to any LLM payload and never logged.
- **TC-PURE-01:** everything on the default path (tenure parse, alias match,
  seniority-aware status, section merge) stays framework-free in
  `shared/lib` / entity `lib`.

## Open question

Date-range parsing for tenure must handle English and Ukrainian month names plus
"present"/"дотепер" markers; the v1 token set should be reviewed with a native
speaker alongside the UA copy review already pending.
