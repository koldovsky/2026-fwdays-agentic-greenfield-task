# ADR-0017 — Drop the `temperature` param from the LLM seam

*Status: Accepted · Date: 2026-06-30 · Amends [ADR-0013](./0013-eval-framework.md) §Decision
(dataset evals "at temperature 0") · Source: `src/llm/structured.ts` (the single `messages.create`
seam, invariant #5).*

## Context
The structured-output seam ([requirements §8.0](../requirements.md), invariant #5 — exactly one
`messages.create`, no agent loop) set `temperature: 0`. The intent was reproducible, code-gradeable
classification, and [ADR-0013](./0013-eval-framework.md) leaned on it: its **dataset eval** runner
issues the real LLM operation "at **temperature 0**" and absorbs residual stochasticity by grading
**accuracy over a labeled set**, not per-call equality.

Two facts now collide with the hard-coded `temperature: 0`:

1. **Deprecation.** Anthropic is deprecating `temperature` as a sampling-control knob. It already
   returns `400` on Opus 4.7+ and Fable. The seam is model-agnostic by design (Sonnet 4.6 today,
   but the prefix/schema machinery is shared); pinning `temperature` risks a hard failure the day a
   call routes to a model that rejects it.
2. **It was never the reproducibility lever it looked like.** Determinism here rests on the
   **constrained structured output** (a JSON schema derived from the caller's zod schema) over a
   **small enum-heavy surface** (`intent`, `source`, `meal`, a resolved date), not on the sampler.
   Even where accepted, `temperature: 0` never guaranteed byte-identical outputs. ADR-0013 already
   designed for this — accuracy-over-a-labeled-set, with a 100% bar only on CRITICAL model-dependent
   fields — so removing the param does not change what the evals actually rely on.

## Decision
**Omit `temperature` from the seam entirely.** The single `messages.create` keeps everything else —
structured output, the cached system prefix, only the current message (no chat history, invariant
#1), no tool-call loop (invariant #5). Reproducibility of classification is owned by the constrained
schema + small label set, exactly as ADR-0013's grader already assumes.

This **amends ADR-0013**: wherever it says dataset evals run "at temperature 0," read "with the
default sampler, graded by accuracy over the labeled set." The grading strategy is unchanged; only
the now-removed knob is.

## Consequences
- **+** Seam stays valid across models — no `400` when a call routes to a temperature-rejecting
  model (Opus 4.7+/Fable). Future model swaps don't touch this code.
- **+** Removes a misleading "determinism" signal; the real guarantee (schema + labeled accuracy) is
  now the only one stated.
- **−** No `temperature: 0` floor on sampling variance. Mitigated: ADR-0013 grades accuracy over a
  set, and CRITICAL fields keep a 100% bar. **Watch item:** if eval accuracy regresses once the
  live LLM/eval run happens (deploy-time, needs `ANTHROPIC_API_KEY`), revisit — options are tighter
  schemas, more label cases, or a model-specific determinism setting if one ships.
- Reversible per-model: if a future model reintroduces a determinism control, add it behind the seam
  without touching callers.

## Alternatives considered
- **Keep `temperature: 0`** — rejected: hard-fails on models that already reject the param, for a
  reproducibility benefit that was never real.
- **Set it conditionally per model** — rejected as premature: adds model-branching to the seam for
  no current gain; revisit only if a model ships a determinism knob worth the branch.
- **Lower `max_tokens` / other sampler knobs** — orthogonal to the deprecation; not the lever in
  question.
