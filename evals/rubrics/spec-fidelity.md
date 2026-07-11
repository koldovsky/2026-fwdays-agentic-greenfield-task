# Rubric: spec fidelity (drafted spec vs the source-of-truth docs)

The rubric the `eval-judge` applies during `/author-slice`'s **fidelity-eval** step. It is the
*direction* check of the spec loop — the automated stand-in for the owner reading the spec and
asking **"is this what I actually asked for?"** It grades whether the drafted spec is **faithful
to the intent** of the ratified docs, NOT whether the spec is internally well-formed (that is the
`spec-griller`'s robustness lens) and NOT the mechanical hygiene `check-specs` already enforces
(single-owner ids, closed questions). Those run separately; here the only question is **did the
author go in the right direction, or did the LLM drift.**

This is the spec-loop analogue of `trajectory-quality.md`: that grades how a slice was *built*;
this grades whether the spec points at the *right target*.

## The case

- **Input:** the drafted OpenSpec change (`openspec/changes/<name>/**`) + its anchor, the slice's
  handed requirement-id set, and the source-of-truth docs it must be faithful to
  (`docs/product-brief.md`, `docs/requirements.md`, `docs/architecture.md`, `docs/DESIGN.md`).
- **Output:** the `eval-judge` verdict `{score, pass, criteriaMet, criteriaMissed, reasoning}`.

## How to judge (for the eval-judge)

Judge each criterion strictly against the evidence, citing it (a requirement id + its text in
`requirements.md`, an `architecture.md` section, a brief line, and the drafted scenario it maps
to or drifts from). Then apply the CRITICAL gate:

> **If any `CRITICAL` criterion is unmet → `pass = false` and `score <= 49`,** regardless of the
> others. If every CRITICAL criterion is met → `pass = true`, `score` in 50–100 from the
> non-critical criteria.

On a FAIL, phrase `reasoning` as a **drift diagnosis the author can act on** ("the spec added a
`window` parameter the brief does not ask for and `TC-SCOPE-01` excludes — remove it"; "scenario
3 asserts a 5-day streak but FR-METR-05's text says consecutive *active* days — re-read the id"),
because `/author-slice` routes it back to the `spec-author` as rework and never rolls back.

## Criteria

### `intent-alignment` — CRITICAL

Every behavior the spec asserts traces to the **actual text** of a requirement in
`requirements.md`, and matches that text — not a drifted paraphrase.

- **Met:** each `### Requirement:` maps to a handed id whose `requirements.md` text says the same
  thing; each scenario's observable follows from that text or the `architecture.md` it cites.
- **Not met (any one):** a scenario asserts behavior no requirement states (invented); a scenario
  contradicts or quietly narrows/widens its id's text; a number/threshold/enum **value** differs
  from the `architecture.md` value it claims to implement.
- **Tie-break (resolve the overlap with `architecture-fidelity` deterministically):** **any wrong
  architecture *value*** — a formula constant, threshold, boundary, window length, status code,
  field/enum value — is an `intent-alignment` failure and trips this CRITICAL. `architecture-
  fidelity` (below, non-critical) covers only *structural/derivation* faithfulness (right shape,
  right approach), **never a raw value**. This makes a "built wrong number" the loop exists to
  catch always `pass:false`, so `eval-judge` cannot return pass on it — preserving its
  same-case-same-verdict determinism.

### `no-scope-drift` — CRITICAL

The spec stays within what the docs asked for — nothing the brief or `TC-SCOPE-01` excludes, and
it solves **this** slice's problem, not an adjacent one.

- **Met:** every requirement/scenario is inside the handed id set and the product's stated scope;
  no drive-by capability the brief does not want.
- **Not met:** scope creep into an excluded area (teams, tracking, another slice's ids), or the
  spec solves a different problem than the handed ids describe.

### `product-vision-fit` — non-critical (weight 0.4)

The spec serves the `product-brief.md` north star and does not contradict the product's stated
positioning/promise.

### `architecture-fidelity` — non-critical (weight 0.3)

Where the spec states HOW, it follows `architecture.md`'s **structure and derivation** — the right
data shape, the right approach/decision, not a re-derived or approximated method. **Raw-value
mismatches are NOT scored here** — they trip `intent-alignment` (CRITICAL) per the tie-break above.
This criterion is only the *semantic/structural* faithfulness that survives once values are known
correct (e.g. the spec describes the §3.7 midnight-split as splitting minutes across local days —
the right mechanism — vs a different mechanism, independent of any single number).

### `completeness-vs-intent` — non-critical (weight 0.3)

The spec covers **what the handed requirements actually ask for** — no part of a requirement is
silently dropped, no owned id left with zero real scenarios. (This is coverage against *intent*;
`check-traceability` covers the mechanical id→test mapping later.)

## Score guidance (only when the CRITICAL gate is passed)

Start at 100 and deduct for weak non-critical criteria per their weights. Reserve **90+** for a
spec that is clearly on-target, fully faithful to the docs, and complete against intent. A pass
with notable drift risk in a non-critical criterion lands in 50–89 with the gap named in
`criteriaMissed`. If the CRITICAL gate fails, the reasoning must be a concrete, doc-cited drift
the author can correct in one rework.
