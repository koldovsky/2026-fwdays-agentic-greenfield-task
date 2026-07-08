# Eval Verdict: evals-hardening

**Verdict:** pass  
**Date:** 2026-07-08  
**Gate:** G5

## Evidence Summary

| Check | Result |
| --- | --- |
| Red tests before implementation | Confirmed — missing expected.json coverage, ratchet, EXIF fixture |
| Core unit tests | 31 passed (includes EXIF JPEG integration) |
| App unit tests | 4 passed |
| MCP unit tests | 9 passed |
| Eval harness | 6 passed (dataset coverage + output ratchet + provisional checks) |
| Output eval pass rate | **90.0% (36/40)** @ threshold 0.5 |
| Core line coverage | **76.2% (346/454 lines)** |
| Ratchet baselines | Locked in `evals/baselines/output-eval.json` and `coverage.json` |
| Format / build / OpenSpec strict | Pass |
| Check scripts | Pass (traceability, eval ratchet, coverage ratchet, gate status) |

## Trajectory

1. OpenSpec change `evals-hardening` created for NFR-EVAL-01 and NFR-TEST-01.
2. Red tests for `expected.json` completeness, output-eval ratchet, and EXIF-oriented JPEG preprocessing.
3. Hardened `OutputEvalRunner` (positives ≥ threshold, negatives zero detections) and removed runtime auto-generation of `expected.json`.
4. Locked output-eval and Core coverage baselines from observed green run.
5. Upgraded gate scripts to enforce ratchets (threshold/case-count binding, canonical coverage path, eval via test host).
6. Added golden EXIF fixture `Fixtures/exif-right-top.jpg` for orientation integration coverage.

## Checker Findings

- **Code review:** Eval runner validates manifest sync before inference; ratchet scripts delegate eval execution to xUnit host for native dependency correctness.
- **Spec compliance:** NFR-EVAL-01 and NFR-TEST-01 scenarios covered by eval tests and gate scripts.
- **Security:** Pass — ratchet scripts now bind `confidenceThreshold` and `totalCases` to baseline; coverage ratchet reads latest report from canonical Core test output directory only.

## Residual Risks

1. **Low:** Output eval remains at 90% due to four negative false positives; improving model quality is out of slice scope.
2. **Low:** Gate report script is informational; enforcement relies on ratchet scripts in pre-commit/CI.

## Required Follow-up

- MVP capability plan complete at G5; no further slices in current plan.
