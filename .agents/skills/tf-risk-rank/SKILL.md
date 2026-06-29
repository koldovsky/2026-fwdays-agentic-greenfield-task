---
name: tf-risk-rank
description: >-
  Rank Terraform plan changes by risk under a user-supplied criterion (e.g.
  "what could cause data loss?", "what touches prod?"). Use when a user asks to
  triage or prioritise a `terraform plan` instead of reading the whole diff.
---

# tf-risk-rank

One capability, many surfaces (Day 03): the same `SKILL.md` works in a dev agent
(Claude Code), inside a product, or in a personal runner — copy the folder, no changes.

## What it does

Given a `terraform plan -json`, produce a **ranked** list of the changes that matter
most for the user's stated criterion, with a one-line reason each.

## How to run it

The deterministic engine is shipped in this repo and needs **no credentials**:

```bash
terraform show -json plan.bin | npx tsx src/cli.ts --json
```

The JSON report (`findings[]` with `score`, `risk`, `rules[]`) is your input. Each
finding is already scored 0..100 and classified `high|medium|low` (see
`docs/adr/0001-risk-score-model.md` for the model).

## How to rank under a free-form criterion

1. Run the engine to get the structured `findings[]` (facts you can trust).
2. Re-order / filter them to fit the user's words:
   - "data loss" → prioritise `risky-delete` on `*_db*`, `*_bucket`, `*_volume`.
   - "ownership / compliance" → prioritise `missing-required-tags`.
   - "prod blast radius" → prioritise findings whose tags include `environment=prod`.
3. Return the top N with the engine's `score` and the rule `detail` as the reason.

## Hard rules

- NEVER invent a score — always cite the engine's number. The engine is the source of
  truth; you only re-rank/explain.
- NEVER claim a `high` finding is safe (see `FR-OUT-02`).
- Stay offline: do not call cloud APIs or fetch credentials.
