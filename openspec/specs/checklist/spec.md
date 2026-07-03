# checklist

## Purpose

Compliance checklist: for each extracted job requirement, produce a grounded
status and a one-sentence Ukrainian rationale, plus an overall weighted match
score. Scoring is deterministic and framework-free
(`shared/lib/scoring/checklist.ts`). Traces: FR-CHECKLIST-01/02/03/04,
TC-PURE-01, BC-HONESTY-01.

## Requirements

### Requirement: Deterministic checklist status
The system SHALL expose `checklistItem(requirement, cvProfile)` as a pure
function returning `{ status, rationale }`, located in
`shared/lib/scoring/checklist.ts` with no `next/*` and no DOM access, so it is
100% unit-testable. Implements FR-CHECKLIST-01, TC-PURE-01.

#### Scenario: Same input yields same output
- **WHEN** `checklistItem` is called twice with identical `requirement` and `cvProfile`
- **THEN** it returns the identical `{ status, rationale }` both times, with no I/O or LLM call

#### Scenario: Status is one of the fixed set
- **WHEN** any requirement is evaluated against a CV profile
- **THEN** `status` is exactly one of `met`, `partial`, `gap`, or `overclaim-risk` (FR-CHECKLIST-02)

### Requirement: Grounded rationale
The system SHALL attach to each checklist item a single-sentence rationale in
Ukrainian, ≤100 characters, with no emoji, stating which part of the CV supports
or contradicts the requirement. Implements FR-CHECKLIST-03, BC-HONESTY-01.

#### Scenario: Rationale references CV evidence
- **WHEN** a requirement is marked `met` or `partial`
- **THEN** the rationale names the supporting experience/skill drawn only from the candidate's CV text

#### Scenario: Rationale format constraints
- **WHEN** a rationale is produced
- **THEN** it is one Ukrainian sentence, ≤100 characters, and contains no emoji

### Requirement: Weighted match score
The system SHALL compute an overall match score from 0 to 100, weighting
`must-have` requirements above `nice-to-have`, and display it as a headline above
the checklist. Implements FR-CHECKLIST-04.

#### Scenario: Must-have weighting
- **WHEN** two profiles differ only in that one meets a `must-have` and the other meets an equivalent `nice-to-have`
- **THEN** the profile meeting the `must-have` receives the higher match score

#### Scenario: Score bounds
- **WHEN** the match score is computed for any input
- **THEN** the result is an integer in the range 0–100 inclusive
