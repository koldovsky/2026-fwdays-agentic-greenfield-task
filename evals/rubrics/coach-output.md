# Rubric: coach output quality (a generated card vs its snapshot)

The rubric the `eval-judge` applies to the coach's **output-eval** — it grades **one
generated coach card** (an insight or a chat reply) against the metrics snapshot it was built
from. It is the judgment layer on top of the deterministic gates: the product promise is a
coach whose every claim traces to a number on the screen (product brief), so **grounding is
the CRITICAL, mechanical criterion** and everything else is scored beneath it.

This mirrors `trajectory-quality.md`'s shape (a CRITICAL gate + scored criteria), but grades
the coach's **product output**, not how a slice was built. It covers **both** halves — the
mechanical grounding gate and a subjective usefulness score — while only the **programmatic**
dimensions feed the committed ratchet (`docs/qa/eval/{baseline,latest}.json`,
`scripts/check-eval-ratchet`); `insight_usefulness` is graded here as a **separate,
non-gating** pass so the CI ratchet stays deterministic and free (NFR-COST-01, M6).

## The case

- **Input:** one fixture `evals/cases/coach/*.json` — `{snapshot, history?, user_message?,
  coach_output}` (the snapshot is a real `SnapshotResponse`; `coach_output` is a §4.2 card) —
  plus its expected grounding outcome.
- **Output:** the `eval-judge` verdict `{score, pass, criteriaMet, criteriaMissed,
  reasoning}`.

## How to judge (for the eval-judge)

Judge each criterion strictly against the evidence, citing the offending number and the
snapshot leaf it does (or does not) trace to. Then apply the CRITICAL gate:

> **If the CRITICAL grounding criterion is unmet → `pass = false` and `score <= 49`,**
> regardless of the others. If it is met → `pass = true`, `score` in 50–100 from the scored
> criteria (weights below).

On a FAIL, phrase `reasoning` as a diagnosis the implementer can act on (which number is
fabricated, and which snapshot leaf it should have cited or been dropped).

## Criteria

### `grounding` — CRITICAL (programmatic)

Every number in the card traces to the snapshot (or a fixed derived rendering, or the user's
own message, or a bare integer 0-9 without units). This is decided **mechanically** by
`app/core/grounding.py::check_grounding` — the same validator the runtime uses — not by
judgment (FR-COACH-02, E-9).

- **Met:** `check_grounding(snapshot, coach_output_text, user_message=...)` returns
  `grounded = True` (no violations).
- **Not met:** any fabricated number — `grounded = False`. A single out-of-snapshot number
  fails the whole card, exactly as it would degrade at runtime.

### `format_conformance` — scored, programmatic (weight 0.4)

The card is the fixed §4.2 shape with valid counts: `{language, quiet, observations[],
recommendations[]}`; `quiet:false` → 2-4 observations + 1-2 recommendations; `quiet:true` →
exactly one observation + no recommendation; no emoji in any text (FR-COACH-05, NFR-DES-01).

### `language_correct` — scored, programmatic (weight 0.3)

The card's `language` **field** equals the expected reply language (`en`/`uk`, FR-COACH-06).

### `insight_usefulness` — scored, subjective, NON-gating (weight 0.3)

The observations are specific and true to the snapshot and the recommendations are concrete
and actionable (or the card is honestly `quiet` when nothing warrants advice, FR-COACH-01).
Graded by the `eval-judge` (LLM) as a **separate pass**; it is **not** in the committed
ratchet.

## Programmatic ratchet dimensions

Only these deterministic, free-to-compute dimensions feed `docs/qa/eval/{baseline,latest}.json`
(`check-eval-ratchet`); `latest` must hold at or above `baseline`:

- `grounding_pass_rate` (= 1.0) — fraction of grounded reference cards the validator passes.
- `grounding_violations` (= 0, **lower is better**) — fabricated numbers in those cards.
- `format_conformance` (= 1.0) — fraction conforming to the §4.2 shape + counts + no-emoji.
- `language_correct` (= 1.0) — fraction whose `language` field matches the expected language.
- `no_emoji` (= 1.0) — fraction free of emoji.

`insight_usefulness` is deliberately **excluded** from the ratchet (subjective, LLM-graded).

## Score guidance (only when the CRITICAL gate is passed)

Start at 100 and deduct for weak scored criteria per their weights; reserve **90+** for a card
that is fully conforming, in the right language, and genuinely useful. A pass with a bland or
weakly-actionable card lands in the 50–89 band, with the gap named in `criteriaMissed`.
