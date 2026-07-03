## Why

Today `run-tailoring` (`add-agent-loop`) runs straight through
parse → extract → generate → ground → score in one continuous stream and hands
the user a finished result with no checkpoint. The PRD's new `wizard` capability
(`FR-WIZARD-01..05`) asks for a guided flow instead: show the match score and
checklist first and **pause**, ask a bounded set of clarifying questions about
the weak spots, only then generate bullets, and make the whole thing feel like a
visible sequence rather than a black box. `BC-HONESTY-03` extends the honesty
model to say a user's own confirmed answer to a clarifying question is a second,
legitimate (but distinctly tagged) grounding source alongside the CV.

Most of the hard part — the two-pass honesty pipeline that produces the
checklist and 0–100 match score — already exists (`src/features/run-tailoring/lib/loop.ts`,
`docs/system-design.md` §4). What's missing is: (1) a real pause between
analysis and generation, (2) a way to generate targeted clarifying questions
without inventing leading ones, (3) a way to tag a bullet's evidence as
CV-sourced vs user-confirmed without breaking existing grounding consumers, and
(4) an export step — `FR-EXPORT-01..04` are proposed in the PRD but zero export
code exists in this repo (confirmed by grep). This change closes all four gaps
and, per the task, treats export as the wizard's terminal step since nothing
else in the backlog currently owns it.

## What Changes

- **Split the tailoring loop into two invocable phases** — `analyze`
  (parse-cv → extract-requirements → score, i.e. what the loop already does up
  to the checklist) and `generate` (generate-bullet → ground-bullet\*) — with a
  real pause between them so `FR-WIZARD-01`'s confirmation gate is an actual
  break in execution, not a client-side overlay on a still-running stream.
- **New clarifying-question step (`FR-WIZARD-02/03`)**: a deterministic,
  template-based skill derives up to a bounded number of questions from the
  keywords of `partial`/`gap` checklist rows — no LLM call, so there is no
  leading-question risk by construction.
- **Evidence tagging (`FR-WIZARD-04`, `BC-HONESTY-03`)**: a confirmed clarifying
  answer becomes a second, labelled evidence pool available to both the
  generation and grounding passes; a bullet's grounding source becomes a
  discriminated union (`cv` vs `user-confirmed`) instead of a single
  `sourceSentence` string, so the UI can visibly distinguish the two without
  loosening `BC-HONESTY-01`.
- **Visible linear sequence (`FR-WIZARD-05`)**: Analyze → Confirm → Clarify →
  Generate → Export is a first-class, always-visible step indicator.
- **New `export` step (`FR-EXPORT-01..04`)**: clipboard copy, PDF (`@react-pdf/renderer`),
  DOCX (`docx`), and a free-tier footer line — all built from one shared,
  format-agnostic document model so "what's in the export" has a single source
  of truth across formats. The exported document's font is chosen independently
  of the web UI's display font, resolving the known Bricolage-Grotesque-has-no-
  Cyrillic-subset gap for this specific surface (see `docs/current-state.md`
  Blockers).

## Capabilities

### New Capabilities

- `wizard`: the paused, multi-turn tailoring flow — analyze/confirm/clarify/
  generate steps, the deterministic clarifying-question skill, and the
  user-confirmed evidence pool. Serves `FR-WIZARD-01/02/03/04/05`. Its terminal
  step is export, serving `FR-EXPORT-01/02/03/04` (owned here since no other
  change currently claims them).

### Modified Capabilities

- `bullets` (baseline, `openspec/specs/bullets/spec.md`): the grounding-indicator
  requirement's evidence shape gains a second, distinctly-tagged source kind
  (`user-confirmed`, alongside the existing `cv` source) — see `design.md` §3.
  This is additive to the requirement's intent, not a reversal of it; a
  `specs/bullets/spec.md` MODIFIED delta should be authored when implementation
  starts (tracked in `tasks.md`), not in this proposal-only pass.
- `agent-loop` (in-flight, not yet archived — `openspec/changes/add-agent-loop`):
  this change splits `runTailoringLoop` into two phases and extends
  `GenerationInput`/`GroundingInput` with an optional confirmed-answers evidence
  pool. Not listed as a formal "Modified Capability" because `agent-loop` is not
  yet a baseline spec; coordinate the loop-split with whoever finishes
  `add-agent-loop` increment 2/3, ideally before it archives (see `design.md` §1).

## Impact

- New: `entities/clarifying-question`, `features/clarify-tailoring`,
  `features/export-resume`, `widgets/clarify-panel`, `widgets/wizard-stepper`,
  route handlers `src/app/api/tailor/analyze`, `src/app/api/tailor/generate`,
  `src/app/api/export/pdf`, `src/app/api/export/docx`.
- Changed: `entities/bullet` (`sourceSentence` → `source: GroundingSource`),
  `shared/lib/llm/types.ts` + `prompts.ts` (confirmed-answers evidence pool),
  `features/run-tailoring` (loop split, event/result types), `widgets/bullet-list`
  (render the new source kind), `shared/lib/i18n` (`ua.ts`/`en.ts` new keys),
  `views/tailor-workspace` (owns the 5-step wizard state machine).
- New dependencies: `@react-pdf/renderer`, `docx` (both pure-JS, no native
  binary — see `design.md` §4).
- Depends on: `add-agent-loop`'s existing skill registry, prompt builders, and
  scoring core (reused, not replaced). Export's free-tier footer (`FR-EXPORT-04`)
  needs a plan/entitlement check that will come from `add-payments-emulator`;
  until then it defaults to the free-tier footer (fail toward the calmer,
  non-overclaiming default).
- Serves: `FR-WIZARD-01/02/03/04/05`, `FR-EXPORT-01/02/03/04`, `BC-HONESTY-03`,
  `NFR-I18N-01` (new copy centralized), `TC-PURE-01` (question builder + document
  model stay pure; only the route handlers and rendering calls do real IO).
