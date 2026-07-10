# evals — the judgment layer

LLM-graded evaluation that sits **on top of** the deterministic gates in
[`scripts/`](../scripts/). The gates prove what git and code can show; the evals grade the
judgment calls the gates explicitly defer — see the honesty boundary in
[`docs/qa/trajectory.md`](../docs/qa/trajectory.md). Grading is done by the generic
[`eval-judge`](../.claude/agents/eval-judge.md), which applies a **rubric** to **one case**
and returns `{score, pass, criteriaMet, criteriaMissed, reasoning}`.

## Layout

```
evals/
  rubrics/                       # the rubrics eval-judge applies (domain rules live here)
    trajectory-quality.md        # grades HOW a slice was built (used by /run-slice)
```

- **`rubrics/trajectory-quality.md`** — the process rubric the trajectory-eval step of
  [`/run-slice`](../.claude/commands/run-slice.md) applies to a slice's diff: test-first
  (RED before green) and no-test-weakened are `CRITICAL`; scope, loop, and honest reporting
  are scored. Any unmet CRITICAL forces `pass=false`, `score<=49`.

## Coming with the coach slice (006)

The **coach output-eval** — a rubric plus scenario/output cases that grade the coach's
generated insights — lands with slice 006, alongside the score files the deterministic
[`check-eval-ratchet`](../scripts/check-eval-ratchet) already watches for
(`docs/qa/eval/{baseline,latest}.json`). The `eval-judge` is generic, so it grades those
cases with no change: only a new rubric and its cases are added here.
