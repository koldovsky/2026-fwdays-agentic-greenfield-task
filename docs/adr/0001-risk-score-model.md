# ADR 0001 — Risk score model

- Status: accepted
- Date: 2026-06-29
- Relates to: `FR-SCORE-01`, `FR-SCORE-02`

## Context

Each Terraform resource change needs a single comparable number so findings can be
ranked and CI can gate on a threshold (`BC-EXIT-01`). The model must be deterministic
(`NFR-DETERMINISTIC-01`), explainable to a reviewer, and cheap to extend when new
policy rules are added.

## Decision

Score = `clamp(0, 100, actionWeight + Σ ruleWeight(matched))`.

- **Action weights**: `delete`/`replace` = 40, `update` = 15, `create` = 5,
  `no-op`/`read` = 0. Destructive actions dominate because they carry irreversible
  blast radius.
- **Rule weights**: `risky-delete` (stateful destroy) = 50, `missing-required-tags`
  = 20. A destructive change to a stateful resource therefore lands ≥ 90 (high risk),
  which is the intended "stop and look" signal.
- **High-risk threshold**: 70. At/above → finding is "high risk" and drives exit
  code 1.
- **Medium band**: 40–69. Used to surface elevated-but-not-critical changes (e.g. a
  destructive action on a *stateless* resource, or an unrecognized `unknown` action,
  both weight 40) even when no policy rule matched. Below 40 is "low".
- **Unknown actions**: any action string tf-guard doesn't recognize is scored at
  weight 40 (`unknown`), never 0 — a risk tool must fail safe, not fail open.

## Why not alternatives

- *LLM-assigned scores*: non-deterministic, needs credentials, fails `NFR-OFFLINE-01`
  and can't be a CI gate. Rejected for the core; kept as an optional skill surface.
- *Multiplicative model*: harder to explain and to unit-test for exact equality.

## Consequences

- Adding a rule = add its weight + a unit test asserting the exact score. The eval
  suite still checks that the *summary wording* respects `FR-OUT-02`.
- Weights are constants in `src/lib/score.ts`; changing them is a reviewed decision
  that updates this ADR.
