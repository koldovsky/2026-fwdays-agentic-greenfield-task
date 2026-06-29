# DESIGN.md — tf-guard

Design decisions, made explicit *before* the spec, so the agent builds the right thing
and a future reader understands the intent (not just the behaviour).

## Shape

A classic **functional core / imperative shell**:

```
terraform plan -json ─▶ src/cli.ts (shell: read file / stdin, print, exit code)
                              │
                              ▼
                     src/lib/parse.ts  (zod boundary → ResourceChange[])
                              │
                  ┌───────────┴────────────┐
            src/lib/rules/*           (pure predicates → Finding[])
                  │
            src/lib/score.ts          (Finding[] → scored, total function)
                  │
            src/lib/summarize.ts      (scored → ranked text + JSON report)
```

Everything below `cli.ts` is pure. That is the whole point: the risk logic is a
deterministic function, so unit tests are exact gates, and the only thing that needs
fuzzy *evals* is the human-readable wording produced by `summarize.ts`.

## Key decisions

1. **Risk score is data-driven, additive, and clamped 0..100.** Action weight
   (`delete`/`replace` > `update` > `create`) plus per-rule weights. Deterministic,
   easy to test, easy to explain. See `docs/adr/0001-risk-score-model.md`.
2. **Rules are independent pure predicates.** Adding a policy = adding one file under
   `src/lib/rules/` + one test. No change to the scorer. Clean blast radius.
3. **`zod` only at the boundary.** Untrusted plan JSON is validated once; the rest of
   the code trusts its types. Explicit contract = machine-verifiable input.
4. **Keyless by design.** The "ranking under a user criterion" capability is exposed
   as a portable `SKILL.md` (Day 03) that an agent *could* run, but the shipped tool
   uses the deterministic scorer so it runs in CI with zero credentials.

## Static vs dynamic context

- **Static** (always loaded): `AGENTS.md`, this file. Kept thin.
- **Dynamic** (on demand): `.agents/skills/tf-risk-rank/SKILL.md` — procedural
  knowledge the agent loads only when the task matches.
