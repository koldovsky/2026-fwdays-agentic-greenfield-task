# Eval case — round-trip corpus catches a seeded meaning change

- **Agent:** `round-trip-reviewer` + the execution-based round-trip corpus (AD-011)
- **Tier:** model-judged + execution (**lifecycle-gated** — needs M1+ codec code; cannot run pre-M0)
- **Traces:** strict semantic round-trip (AD-004), §15.7/§15.8

## Input

A codec/IR change that **silently changes meaning** — e.g. swapping a variant match so a template
imports-then-exports to a different-but-plausible rule arm, or dropping a marker-escape so `@`/`$`
staging collapses.

## Expected behavior

- The execution-based round-trip corpus **fails** on the seeded diff: import→export no longer
  preserves meaning for an in-surface template, so the corpus diff is non-empty.
- The `round-trip-reviewer` flags the trust-critical path (codec / variant matcher / marker escape)
  and returns a 🔴 verdict before merge.

## Pass rubric

1. The corpus detects the seeded change (red), not a green false-pass. ✅ critical
2. The reviewer identifies it as a round-trip/meaning regression, not a cosmetic diff. ✅ critical
3. Reverting the seed returns the corpus to green.

## Status

Deferred until M1 lands the codec and the round-trip corpus exists (plan item M-15). Until then this
case documents the intended guard; `run_evals.py` covers the harness-config invariants that *can* run
today.
