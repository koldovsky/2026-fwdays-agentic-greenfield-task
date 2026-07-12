# Improvement Proposal: improve-PD-18

- **Defect:** PD-8's archive bar is `review-findings.json` `clean:true` = ZERO confirmed findings. A thorough adversarial review is asymptotic — it always surfaces some minor/doc item — so "zero confirmed" is effectively unreachable and blocks every earned slice from archiving. (Discovered driving S5: 7 review rounds, ~14M tokens, code clean, still clean:false on minor/doc items.)
- **Class / severity:** check-too-weak (over-strict) / P1
- **Status:** approved (user chose "severity-aware PD-8")

## Fix

- `review-gate.js` records per-confirmed-finding severity: `confirmed: [{title, severity, dimension}]`.
- `check-trajectory.mjs` treats review evidence as earned when `clean:true` OR (a real review-gate run whose confirmed findings are ALL minor/low — none major/critical/high). The new `clean-minor` state warns (never silent) that minors were accepted; major+ still hard-blocks under `--release`.

## EXECUTED red->green proof

`tests/check-review-severity.test.mjs`:
```
ok  minor-only is clean-minor          (was "unclean")
ok  minor-only passes --release        (was exit 1)
ok  major present is unclean
ok  major present fails --release
4/4
```
PD-8 test unchanged: 6/6.

## Rollback

Single commit; `git revert`. Experimental.

## Approval

Serhii, 2026-07-11 (in-session: "PD-18 severity-aware PD-8"). Refs: PD-18.
