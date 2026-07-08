# Eval Verdict: core-preprocessing

**Verdict:** pass-with-risks  
**Date:** 2026-07-07  
**Gate:** G4.1

## Evidence Summary

| Check | Result |
| --- | --- |
| Red tests before implementation | Confirmed — tests failed with missing `TrafficSignScanner.Core.Preprocessing` namespace |
| Tests green after implementation | 12 Core tests passed |
| Eval harness smoke | 4 eval tests passed |
| `dotnet format --verify-no-changes` | Pass (after format run) |
| Solution build | Pass |
| OpenSpec `validate --all --strict` | Pass (5 specs) |
| `check-gate-status.cs` | Pass |
| `check-traceability.cs` | Pass |
| `check-eval-ratchet.cs` | Pass (baseline pending — expected pre-G5) |
| `check-coverage-ratchet.cs` | Pass (baseline pending — expected pre-G5) |

## Trajectory

1. OpenSpec change `core-preprocessing` created (proposal, design, tasks, spec delta).
2. Failing unit tests added with `@trace FR-PREPROC-*` on public logic and test methods.
3. Core implementation added: `CenterCropCalculator`, `ImagePreprocessor`, `OrientationNormalizer`, `PreprocessingResult`.
4. Checker pass (code-reviewer) flagged missing EXIF orientation handling — addressed with `OrientationNormalizer` wired into decode path.
5. Checker pass (spec-compliance-auditor) confirmed FR-PREPROC-01..03 and OpenSpec scenarios map to code/tests.
6. OpenSpec change archived to `openspec/changes/archive/2026-07-07-core-preprocessing/`.

## Checker Findings

### Code reviewer

- **High (resolved):** EXIF orientation not applied before crop on encoded-byte decode — fixed via `OrientationNormalizer`.
- **Core purity:** No MAUI/platform references in Core preprocessing code.

### Spec compliance auditor

- All FR-PREPROC requirements and OpenSpec preprocessing scenarios covered.
- Portrait integration test added after audit.
- Orientation normalization covered by unit tests; no end-to-end EXIF JPEG fixture yet.

## Residual Risks

1. **Low:** No golden EXIF JPEG integration test — orientation is validated via `OrientationNormalizer` unit tests and Skia canvas transforms from established SkiaSharp patterns.
2. **Info:** `image_tensor` naming deferred to `core-inference` slice (expected).

## Required Follow-up

- Next slice: `core-inference` (includes provisional eval run per G3 amendments).
- G5 ratchet lock remains deferred to `evals-hardening`.
