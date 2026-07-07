# Evals Specification

## Purpose

Define real-model output evaluation and ratcheted quality gates for the detector pipeline.

## Requirements

### Requirement: Output Eval Dataset Coverage
The eval harness SHALL run against every image in `evals/dataset/` using expectations declared in `expected.json`. Refs: `NFR-EVAL-01`.

#### Scenario: Expected manifest covers dataset
- **GIVEN** the eval dataset folders contain `.jpg` images
- **WHEN** the eval harness loads `expected.json`
- **THEN** every dataset image has a corresponding eval case

#### Scenario: Positive case passes with thresholded detection
- **GIVEN** a positive eval case with an expected label
- **WHEN** output eval runs against the image
- **THEN** the detector returns that label with confidence at or above the configured threshold

#### Scenario: Negative case passes with zero detections
- **GIVEN** a negative eval case
- **WHEN** output eval runs against the image
- **THEN** the detector returns no accepted detections

### Requirement: Output Eval Ratchet
The repository SHALL compare aggregate output-eval pass rate against a locked baseline and fail gates when the rate regresses. Refs: `NFR-EVAL-01`.

#### Scenario: Pass rate meets baseline
- **GIVEN** `evals/baselines/output-eval.json` defines a minimum pass rate
- **WHEN** `check-eval-ratchet.cs` runs after eval execution
- **THEN** the observed pass rate is greater than or equal to the baseline

### Requirement: Core Coverage Ratchet
Core deterministic unit tests SHALL maintain line coverage above a locked baseline. Refs: `NFR-TEST-01`.

#### Scenario: Core line coverage meets baseline
- **GIVEN** `evals/baselines/coverage.json` defines a minimum Core line rate
- **WHEN** `check-coverage-ratchet.cs` runs after Core tests with coverage collection
- **THEN** the observed Core line rate is greater than or equal to the baseline
