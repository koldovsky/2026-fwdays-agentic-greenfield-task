# tf-guard

> Homework for **fwdays Academy · Agentic Engineering: Greenfield**.
> A tiny, **keyless, offline** CLI that risk-ranks a `terraform plan -json` so the
> dangerous changes can't slip through review or CI unnoticed.

The product is deliberately small. The point is the **process**: one vertical
capability (risk-scoring) carried end to end through the agentic-engineering loop —
spec → failing tests → green → eval → independent review — with all context living in
the repo, not the chat.

## Quick start

```bash
npm install
npm run verify          # lint · typecheck · test · eval (the full gate)

# run it
terraform show -json plan.bin | npx tsx src/cli.ts          # from a real plan
npx tsx src/cli.ts tests/fixtures/plan-mixed.json           # from a fixture
npx tsx src/cli.ts tests/fixtures/plan-mixed.json --json    # machine-readable
```

Exit code is `1` when any finding is high risk (`BC-EXIT-01`), so CI can gate on it.

```
tf-guard — 2 high, 0 medium, 3 low · 5 changes
[HIGH] 90 aws_db_instance.main — delete of stateful resource
[HIGH] 90 aws_s3_bucket.assets — replace of stateful resource
[LOW ] 25 aws_instance.worker — missing tags: owner
2 changes with no policy findings.
```

## How it works

Functional core / imperative shell. Everything under `src/lib/` is pure (no I/O), so
unit tests are exact gates; only the human-readable wording needs fuzzy *evals*.

```
plan -json ─▶ src/cli.ts ─▶ parse.ts (zod) ─▶ rules/* ─▶ score.ts ─▶ summarize.ts
                (shell)        (boundary)      (pure)     (pure)       (pure)
```

See [DESIGN.md](DESIGN.md) and [docs/adr/0001-risk-score-model.md](docs/adr/0001-risk-score-model.md).

## Agentic-engineering practices — and where to see them

| Practice | Evidence in this repo |
| --- | --- |
| **Context engineering / rules** | [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md) (one-line pointer) |
| **Static vs dynamic context** | static = AGENTS.md/DESIGN.md; dynamic = [`.agents/skills/tf-risk-rank/SKILL.md`](.agents/skills/tf-risk-rank/SKILL.md) |
| **Spec-driven development** | [docs/requirements.md](docs/requirements.md) (FR/NFR/TC/BC) + [openspec/](openspec/) change & capability spec |
| **Intent captured in repo** | [docs/adr/0001-risk-score-model.md](docs/adr/0001-risk-score-model.md) |
| **Tests (deterministic)** | [tests/](tests/) — exact-equality on parse/rules/score/summary |
| **Evals (non-deterministic surface)** | [evals/](evals/) — rubric over a dataset + baseline **ratchet** |
| **Loop engineering / gates** | [`.githooks/pre-commit`](.githooks/pre-commit), [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |
| **maker ≠ checker** | independent reviewer pass → [docs/review-trace.md](docs/review-trace.md) |
| **Secrets hygiene** | keyless by design; [.env.example](.env.example) only; hook scans staged diffs |
| **Skill as a capability (Day 03)** | [`.agents/skills/tf-risk-rank/SKILL.md`](.agents/skills/tf-risk-rank/SKILL.md) — same capability, many surfaces |

## Tests vs Evals (why both)

- **Tests** check the deterministic core: `expect(score(...)).toBe(90)`. One input, one
  right answer.
- **Evals** check the *summary* the way the course teaches — many valid wordings, so we
  grade properties (≤100 chars, never call a high-risk change "safe", header counts
  match the data, no high finding dropped) on a dataset, with a threshold and a
  ratchet that never silently drops. Update the bar deliberately with
  `npx tsx evals/run.ts --update-baseline`.

## Demo

▶ **[asciinema.org/a/7uYgsQjnRiH50oYG](https://asciinema.org/a/7uYgsQjnRiH50oYG)**

Also committed as `docs/demo.cast` — replay locally with `asciinema play docs/demo.cast`,
or regenerate with `npm run demo`.

## Stack

TypeScript (strict, ESM), Node ≥ 20. Tests: Node's built-in `node:test` (no test
framework). Lint: eslint (flat). Boundary validation: zod — the only runtime
dependency. No network, no credentials. `npm ci` installs clean on any platform.

---

<sub>Assignment brief & submission rules: see the
[course task repo](https://github.com/koldovsky/2026-fwdays-agentic-greenfield-task).</sub>
