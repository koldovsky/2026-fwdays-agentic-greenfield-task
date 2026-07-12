# Waiver: deploy-gated performance NFRs pending live measurement

**Status:** open

**Waives:** `NFR-PERF-01`, `NFR-PERF-02`

**Check:** `check-acceptance-methods --mode=existence` (the `deploy-gated` method
has no local mechanism).

## Why

`NFR-PERF-01` (shell interaction budget) and `NFR-PERF-02` (document-render
performance) are **`deploy-gated`**: their acceptance evidence is a Lighthouse /
p95-TTFB measurement against a live deployment, not a local check. The master
playbook (G7) states deploy-gated NFRs are *"marked pending live measurement in
the gate output — explicit, never silently skipped or used to block."*

No `deploy-gated` mechanism (`scripts/check-deploy*`, a deploy workflow, or a
`deploy:verify` script) exists yet, and building one before a deployment target
exists would be a stub — the very thing the acceptance gate forbids. So the
honest state is: the method is correctly declared, its mechanism is deferred to
deployment (Phase 7), and this waiver records that deferral out loud rather than
hiding it.

## Exit condition

Close this waiver (`Status: closed`) in the same change that adds the deploy
verification mechanism and produces `docs/qa/deploy-verification.json` with the
measured budgets. At that point `deploy-gated` resolves and the waiver is no
longer needed.

## Owner

Serhii · 2026-07-10
