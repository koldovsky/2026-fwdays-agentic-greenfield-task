# Eval Verdict: core-inference

**Verdict:** pass-with-risks  
**Date:** 2026-07-07  
**Gate:** G4.2

## Evidence Summary

| Check | Result |
| --- | --- |
| Red tests before implementation | Confirmed — detection namespace/types missing before implementation |
| Core unit tests | 20 passed |
| Eval harness | 5 passed (incl. provisional output eval) |
| Provisional pass-rate | **90.0% (36/40)** — recorded, ratchet not locked |
| Format / build / OpenSpec strict | Pass |
| Check scripts | Pass |

## Trajectory

1. OpenSpec change `core-inference` created and archived.
2. Red tests for parser, label mapper, model copier, session reuse, detector wiring.
3. Core detection pipeline implemented with lazy ONNX session, Int64 class parsing, threshold 0.5.
4. Provisional eval generated `evals/dataset/expected.json` and ran against real `model.onnx`.
5. Checker passes completed (code review, security review, spec compliance).

## Checker Findings

### Code reviewer

- Core remains MAUI-free; model paths supplied by callers/eval runner.
- Model contract honored: `image_tensor`, NCHW raw RGB via preprocessing, output names exact.
- Session reuse verified via counting factory test.

### Security reviewer

- Model copy uses explicit source/destination paths; no network calls.
- Eval runner copies model to temp app-data equivalent path only.

### Spec compliance auditor

- FR-DETECT-01..03 and detection OpenSpec scenarios mapped to code/tests.
- Provisional eval satisfies G3 amendment; G5 ratchet deferred.

## Residual Risks

1. **Medium:** 4/10 negative images produce false positives (model quality, not inference code) — acceptable for provisional eval.
2. **Low:** Box format assumed xmin/ymin/xmax/ymax from probe; overlay slice must validate display mapping.

## Required Follow-up

- Next slice: `core-overlay`
- G5: lock eval ratchet after `evals-hardening`
