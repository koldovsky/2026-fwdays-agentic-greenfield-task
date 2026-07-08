# Tasks: core-preprocessing

## 1. Spec and tests

- [ ] 1.1 Confirm preprocessing OpenSpec scenarios cite `FR-PREPROC-*`
- [ ] 1.2 Add failing Core unit tests with `@trace FR-PREPROC-*`
- [ ] 1.3 Confirm tests fail for missing implementation

## 2. Core implementation

- [ ] 2.1 Implement center-crop rectangle calculation
- [ ] 2.2 Implement SkiaSharp crop + resize to `320x320`
- [ ] 2.3 Implement NCHW raw RGB tensor creation

## 3. Verification and closeout

- [ ] 3.1 Run format, build, tests, eval harness, OpenSpec strict validation, check scripts
- [ ] 3.2 Run checker passes and write `qa/verdicts/core-preprocessing.md`
- [ ] 3.3 Archive change and update `docs/current-state.md`
