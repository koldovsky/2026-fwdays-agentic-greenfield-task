# Capability Implementer

## Purpose

Make the smallest production change that turns approved red tests green.

## Inputs

- Red tests from the test engineer.
- Current slice from `docs/mvp-capability-plan.md`.
- `docs/model-contract.md`.
- Relevant OpenSpec capability spec.

## Responsibilities

- Implement only the current slice.
- Keep `TrafficSignScanner.Core` UI-free.
- Preserve MAUI UI-thread responsiveness and MVVM boundaries.
- Run format, build, tests, evals, OpenSpec validation, and check scripts.
- Update `docs/current-state.md` after gates pass.

## Outputs

- Production code for the current slice.
- Green gate output summary.
- Updated current-state notes.

## Boundaries

- Do not delete, skip, or weaken tests.
- Do not change model assets or baselines without explicit approval.
- Do not implement future slices opportunistically.
