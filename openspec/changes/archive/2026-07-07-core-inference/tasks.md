# Tasks: core-inference

## 1. Spec and tests

- [ ] 1.1 Confirm detection OpenSpec scenarios cite `FR-DETECT-*`
- [ ] 1.2 Add failing Core unit tests with `@trace FR-DETECT-*`
- [ ] 1.3 Confirm tests fail for missing implementation

## 2. Core implementation

- [ ] 2.1 Implement model copy helper and lazy ONNX session holder
- [ ] 2.2 Implement output parser, label mapper, and `IDetector`
- [ ] 2.3 Wire preprocessing tensor into inference

## 3. Provisional eval

- [ ] 3.1 Generate `evals/dataset/expected.json` if missing
- [ ] 3.2 Run output eval and record provisional pass-rate in `docs/current-state.md`

## 4. Verification and closeout

- [ ] 4.1 Run format, build, tests, eval harness, OpenSpec strict validation, check scripts
- [ ] 4.2 Run checker passes and write `qa/verdicts/core-inference.md`
- [ ] 4.3 Archive change and update `docs/current-state.md`
