# ADR-0013 — Eval framework (deterministic-first, local-run + CI ratchet)

*Status: Accepted (decision + design; suites built per-capability as changes land) · Date: 2026-06-29 · Source: PRD §4 (M2 macro accuracy) + §6 acceptance criteria, AGENTS.md non-negotiable rules, [ADR-0012](./0012-implementation-loop-runner.md) eval gate. Reference studied (not reused): `project-factory/.claude/workflows/{eval-suite,trajectory-eval}.js`.*

## Context
[ADR-0012](./0012-implementation-loop-runner.md)'s loop has an **evals** gate, but no framework
behind it. The PRD's acceptance criteria (§6) and the non-negotiable rules (AGENTS.md) double as the
eval targets — and most of them have a **ground-truth answer**: an intent class, a `fact|estimate`
tag, a parsed quantity, a back-dated day. That makes our domain **invariant-heavy**, the opposite of
the reference framework studied, which is **judge-heavy** (an LLM grades quality 0-100). Copying its
emphasis would be expensive, noisy, and reproducibility-poor where we actually have exact labels.

Two grader types are needed, split by whether a right answer exists:

| Behavior | Has ground truth? | Grader |
|---|---|---|
| intent class, `source` tag, qty/product parse, "вчера" date (TZ), macro/qty within band | yes | **code** (labeled dataset) |
| images-never-persisted, totals==SUM, Mifflin–St Jeor, trend diffs | yes, and **no LLM call** | **vitest test** (not an eval) |
| review prose (honest verdict + next action), coaching tone, language-mirror nuance, honest-estimate surfacing | no | **LLM judge** (rubric) |

Constraints: evals call the paid LLM, but the cost cap is M5 ≤ $3/mo and the host is RAM-tight;
CI must stay free and key-less; gates must be commands with exit codes.

## Decision

**Boundary rule — no LLM call → it's a test, not an eval.** Pure math (SUM, Mifflin–St Jeor, trend
diffs) and pure properties (image bytes never hit disk — spy on `fs`) live in the **vitest** test
gate ([ADR-0010](./0010-vitest-test-runner.md)), asserted at 100%. Only **model-output behavior** is
an eval. This keeps the eval suite small, cheap, and focused.

**Two eval kinds:**

1. **Dataset eval (deterministic grader)** — `evals/datasets/<capability>.jsonl` of
   `{ input, expected, meta }`. A runner issues the **real** LLM operation (router / parser / date /
   vision structured-output) at **temperature 0** and compares the structured output to `expected`
   with a **typed matcher**: exact for enums (`intent`, `source`, `meal`), numeric **±band** for
   macros/qty (the ±20–30% estimate tolerance is the band), date-equality for back-dating. Metric =
   **accuracy per capability×field**; gate = accuracy ≥ a per-capability **threshold**. Residual
   model stochasticity is absorbed by grading **accuracy over a labeled set**, not per-call hard
   pass; CRITICAL invariants that *are* model-dependent (e.g. `source` never mislabels a Food-DB
   match as estimate) carry a 100% bar. No LLM judge — the grader is plain code.

2. **Judge eval (LLM grader)** — `evals/cases/<capability>.eval.ts` of `{ scenario, produce(),
   rubric }`, graded 0–100 by a **fresh judge subagent** (maker ≠ checker), with **double-judge**
   on borderline scores (within a band of the threshold) to counter the too-nice-judge failure mode.
   Rubric criteria marked `CRITICAL:` are gating (any miss → fail, score ≤ 49). Reserved for the
   genuinely subjective: review prose, coaching tone, language mirroring, honest-estimate surfacing.

**Run locally, gate in CI on committed scores.**
- The **run** (LLM calls) happens in the loop's eval gate **locally**: `npm run evals` writes
  `evals/results/latest.json` (a build artifact, gitignored).
- The **CI gate** is deterministic and key-less: `npm run check:evals`
  (`scripts/check-eval-ratchet.mjs`) compares `latest.json` to the committed baseline
  `quality/eval-baseline.json` per dimension/capability — **scores may ratchet up, never silently
  down**. Skips gracefully before the first run. No `ANTHROPIC_API_KEY` in CI; spend stays local and
  bounded (M5).

**Cost discipline.** Curated datasets (~10–30 cases/capability). The loop's eval gate runs only the
**touched capability's** cases per change; the full suite runs at milestone boundaries. Prompt-cache
the stable system prefix (rule 5). Judge evals are few by construction.

**Location & lifecycle.** Evals are **central** in `evals/` (datasets + cases + results) with
`quality/eval-baseline.json` committed — they outlive the change that introduced them. A change adds
cases **tagged by capability**; the eval gate selects by tag. (This refines ADR-0012's
"`changes/<id>/evals/`" trigger: authorship can start in the change dir, but the durable home is
central.) Each case carries `trace: [US-#/FR-#]` so evals give NFR/criteria first-class evidence.

**Structural validation is a separate, free gate — not an eval.** `openspec validate --strict`
checks that change/spec **artifacts are well-formed** (schema), complementing `opsx:verify`
(plan⇄impl coherence) on a different axis. It is deterministic, key-less, and wired into the loop's
gate sequence (see ADR-0012, amended): `openspec validate <id> --strict` after `opsx:propose`, and
`openspec validate --all --strict --json` in CI.

**Trajectory eval is deferred.** Grading the *process* a change took (tests-from-spec, no weakened
tests, in-scope, craft) overlaps our existing `review` gate (Standards + Spec, maker ≠ checker) and
`opsx:verify`. We do **not** build it until those prove insufficient; this is a known future ADR.

## Consequences
- **+** Cheap, fast, reproducible — most behavior is code-graded against labels; the LLM judge is
  reserved for the few genuinely subjective surfaces.
- **+** CI stays free and key-less (ratchet + `openspec validate` are exit-code commands); LLM spend
  is local and bounded — consistent with the M5 cost cap and RAM constraints.
- **+** The ratchet makes quality monotonic — a change can tighten the bar, never loosen it silently.
- **+** `trace` ties each eval to a PRD criterion, giving the success metrics (§4) real evidence.
- **−** Local-only LLM runs mean eval scores aren't refreshed by CI — a stale `latest.json` could
  pass the ratchet on old numbers. Mitigated: the loop regenerates it in the eval gate before commit.
- **−** Accuracy-threshold grading tolerates some nondeterminism, so a rare flaky misclassification
  won't fail the gate; CRITICAL fields keep a 100% bar to compensate.
- **−** Deferring trajectory eval leaves process-integrity to the review gate; revisit if loop
  discipline slips.

## Alternatives considered
- **Judge-heavy (reference style)** — LLM-grade most behavior. More flexible, but costlier, noisier,
  and wasteful where we have exact ground truth. Rejected for our invariant-heavy domain.
- **Deterministic only, no judge** — cheapest, but leaves review-prose quality, tone, and language
  nuance ungated — the one area we genuinely lack ground truth. Rejected.
- **Run evals in CI** — always-fresh scores, but needs `ANTHROPIC_API_KEY` in CI and spends on every
  run, pressuring the cost cap. Rejected in favor of local-run + committed-score ratchet.
- **Full trajectory suite now** — multi-dimension process judging up front. Overkill pre-MVP and
  redundant with the review gate. Deferred.
- **Evals per-change only (no central home)** — would lose datasets on archive. Rejected; central
  `evals/` with capability tags.
