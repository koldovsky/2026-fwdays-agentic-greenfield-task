# Harness evals

> Golden-path evals for the **agent harness itself** — not the product. The Transon editor is
> deterministic JSON⇄JSON, so its correctness is proven by unit tests + the execution-based
> round-trip corpus, not by LM-judged output evals. What *is* non-deterministic is the agents: their
> prompts, model routing, and config. These evals guard that surface against silent regression
> (closes gap **G-12**; see [maturity-plan.md](../../docs/guides/maturity-plan.md) item M-02).

Two tiers:

## 1. Deterministic golden-path evals — `run_evals.py`

Pure-stdlib assertions that run in CI and in the pre-commit hook. They fail loudly if a harness
invariant breaks:

| Eval | Guards |
|---|---|
| `maker ≠ checker` | exactly one writable agent (`requirement-implementer`); planner + reviewer stay `readonly` |
| cost-tiered routing | every agent declares a model; the writer's tier differs from the judges' |
| skill determinism | every skill is `disable-model-invocation: true` |
| loop hooks | `hooks.json` wires `stop` + `subagentStop` with bounded `loop_limit`s |
| loop recipe | `implement-requirement.md` still encodes test-first + traceability update |

```bash
python harness/evals/run_evals.py
```

## 2. Model-judged behavioral cases — `cases/*.md`

These need a model in the loop (and, for the round-trip case, code that does not exist pre-M0). Each
case states an input, the expected agent behavior, and a pass rubric for a human or LM-judge. They
are run manually today; they become CI-automatable once a model-runner and `editor-core` land (see
M-15 in the plan). Current cases:

- `cases/planner-one-task-per-fr.md` — the milestone-planner emits exactly one task per in-scope FR.
- `cases/implementer-refuses-ambiguous-spec.md` — the implementer stops and proposes the next free ID
  instead of inventing behavior when the SPEC is ambiguous.
- `cases/roundtrip-catches-seeded-meaning-change.md` — a seeded meaning-changing codec diff is caught
  by the round-trip corpus (lifecycle-gated on M1+ code).
