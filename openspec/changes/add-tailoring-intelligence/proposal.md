# Tailoring intelligence

## Why

Today the honest tailor is precise but blunt. It scores each requirement `met` /
`partial` / `gap` / `overclaim-risk`, rewrites bullets, and stops. Two things
readers of the checklist keep asking for are missing, and both must land without
weakening the honesty core (`BC-HONESTY-01/02/03`):

- **The checklist over-reads as "you failed this."** A requirement the CV does
  not literally name, but which stronger adjacent CV evidence plausibly covers,
  is shown identically to a true `gap` (red). Users read a wall of red and give
  up, when the honest answer is often "you can credibly address this in a cover
  letter." There is no status between a grounded `met`/`partial` and a red `gap`.
- **The flow ends at bullets.** The candidate still has to write the cover
  letter that ties the tailored résumé to the JD — by hand, with no honesty
  guardrail, which is exactly where fabrication creeps back in.

At the same time the pipeline never infers the candidate's **career stage**, so
generated bullets and the (new) cover letter cannot calibrate tone to
junior/mid/senior — while any such inference is a fabrication risk if it is
allowed to invent seniority signals the CV never showed, or to leak into the
grounding pass as an overclaim backdoor.

This change adds three honesty-critical capabilities as one coherent unit:
seniority inference, a blue `info` checklist status, and grounded cover-letter
generation. It is the flagship intelligence layer and **gates the T8 landing
rewrite**, so the spec is written to be precise and testable.

## What Changes

- **Seniority inference (new).** A pure prompt over the candidate's own CV prose
  infers a career stage (`junior` / `mid` / `senior`) plus a short Ukrainian
  rationale. It runs in the analysis phase, tags the tailoring, and calibrates
  generation/cover-letter tone. It SHALL NOT invent skills, numbers, companies,
  or experience absent from the CV (`BC-HONESTY-01`) and SHALL NOT be added to
  the grounding pass's context — grounding stays isolated to CV sentences +
  confirmed answers (`BC-HONESTY-03`, `FR-BULLETS-03`).
- **Blue `info` checklist status (modifies `checklist`, touches `bullets`).** A
  fifth `ChecklistStatus` value, `info`, sitting between a grounded item and a
  red `gap`: for a requirement not surfaced in the CV but plausibly *coverable*
  by stronger adjacent CV evidence. Surfaced as a blue improvement suggestion
  ("розкрийте це в супровідному листі"), not red/missing. Adds the status,
  its deterministic scoring rule, its Ukrainian rationale rule, and its weighted
  score credit; keeps status determinism and the fixed enum (`FR-CHECKLIST-01/02/03/04`).
- **Cover-letter generation (new).** At the end of the flow, a new
  `features/export-cover-letter` slice + a grounded cover-letter prompt carrying
  the same no-fabrication constraints as generation (`BC-HONESTY-01`), a new
  export route, and an `ExportDocument` extension (optional `coverLetter`
  block). The letter is grounded only in CV evidence + confirmed answers; it
  never introduces claims the tailored bullets did not already justify.
- Grounding remains context-isolated: neither seniority nor the cover-letter
  prompt is ever handed to `buildGroundingPrompt` (`BC-HONESTY-03`).
- All new user-facing copy is Ukrainian-first via `shared/lib/i18n`
  (`NFR-I18N-01`); no new brand hues beyond the existing token set for the blue
  `info` treatment (see DESIGN.md — confirm a token exists before adding one).

## Capabilities

### New Capabilities

- `cover-letter`: seniority inference over CV prose (career-stage tag +
  rationale, no fabrication, grounding-isolated) and grounded cover-letter
  generation at the end of the flow (grounded prompt, new export route,
  `ExportDocument` extension).

### Modified Capabilities

- `checklist`: adds the `info` status to the fixed status set, its deterministic
  "coverable by adjacent evidence" scoring rule, its blue improvement-suggestion
  rationale, and its partial weighted-score credit — without loosening status
  determinism or the honest CV-only evidence rule.
- `bullets`: pins the grounding pass's context isolation to explicitly exclude
  the seniority inference and cover-letter context, so neither can act as an
  overclaim backdoor.

## Impact

- Specs: `openspec/specs/checklist/spec.md` (MODIFIED status set + score rules),
  `openspec/specs/bullets/spec.md` (MODIFIED grounding isolation), new
  `openspec/specs/cover-letter/spec.md` (folded in on archive).
- Code — scoring core: `src/shared/lib/scoring/types.ts` (`ChecklistStatus`
  gains `info`), `src/shared/lib/scoring/checklist.ts` (status rule + rationale +
  `STATUS_CREDIT`).
- Code — prompts/pipeline: `src/shared/lib/llm/prompts.ts` (new seniority +
  cover-letter builders; grounding builder unchanged), `src/shared/lib/llm/types.ts`
  (new prompt input/output types), `src/features/run-tailoring/lib/loop.ts`
  (`infer-seniority` step in the analysis phase; seniority threaded to generation
  but never to grounding).
- Code — entities: `src/entities/checklist-item` (status re-export),
  `src/entities/tailoring` (seniority tag on the run result),
  `src/entities/bullet` (unchanged; grounding stays two-source),
  `src/entities/export-document` (optional `coverLetter`).
- Code — UI: `src/shared/ui` (blue `info` `ChecklistRowStatus`),
  `src/widgets/checklist-panel` (map + render `info`), new
  `src/features/export-cover-letter`, `src/app/api/export/cover-letter/route.ts`
  (paid-gated like the existing pdf/docx routes, `FR-PAYWALL-01`),
  `src/widgets/export-stepper` (offer the cover letter), `src/shared/lib/i18n`
  (ua + en copy, `NFR-I18N-01`).
- Product note (open question, see tasks §0): the PRD "Out of scope (MVP)" list
  currently names "Cover letter generation." This change treats that line as
  superseded by the flagship scope; the PRD must be updated (or the cover-letter
  half deferred) before implementation — the spec cites `FR-EXPORT-01` for the
  export surface but there is no dedicated `FR-COVERLETTER-*` ID yet.
- Scheduling: XL change. Gates the T8 landing rewrite — land and verify before
  the landing copy is rewritten around these capabilities.
