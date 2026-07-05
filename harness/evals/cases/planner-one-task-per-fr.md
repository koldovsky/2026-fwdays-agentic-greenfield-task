# Eval case — planner emits one task per FR

- **Agent:** `milestone-planner`
- **Tier:** model-judged (manual / LM-judge)
- **Traces:** the per-FR decomposition contract in `commands/run-milestone.md`

## Input

```
/run-milestone M1
```

(`M1 — editor-core: codec skeleton + G_encode/G_decode for one rule`, per `docs/ROADMAP.md`.)

## Expected behavior

The planner returns a locked design plus an **ordered task list with exactly one task per in-scope
FR/AC** cited for M1 in the ROADMAP — no more, no fewer. It does not:

- pull in FR/AC IDs from other milestones,
- merge two requirements into one task,
- emit a task with no cited ID, or
- write any code (it is `readonly: true`).

## Pass rubric

1. Every M1 FR/AC ID from the ROADMAP row appears in exactly one task. ✅ critical
2. No task cites an ID outside the M1 set. ✅ critical
3. Each task names the package it lands in (`@transon/editor-core`) and is test-first.
4. Output is a plan only — no file writes.

Fail if any milestone ID is dropped, duplicated, or invented.
