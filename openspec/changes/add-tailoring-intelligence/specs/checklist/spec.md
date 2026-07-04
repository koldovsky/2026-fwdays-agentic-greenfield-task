## MODIFIED Requirements

### Requirement: Deterministic checklist status
The system SHALL expose `checklistItem(requirement, cvProfile)` as a pure
function returning `{ status, rationale }`, located in
`shared/lib/scoring/checklist.ts` with no `next/*` and no DOM access, so it is
100% unit-testable. The status set SHALL be exactly the fixed values `met`,
`partial`, `info`, `gap`, and `overclaim-risk`. The new `info` status sits
between a grounded item and a red `gap`: it is assigned deterministically when a
requirement has no keyword grounded in a CV sentence and no keyword claimed only
as a bare skill token, yet stronger adjacent CV evidence plausibly covers it —
i.e. it is an improvement suggestion, not a true absence. `info` SHALL NOT
override `overclaim-risk` (an asserted-but-unsupported skill still fails honest),
and it SHALL NOT be assigned when a requirement is a genuine `gap` with no
adjacent supporting evidence. Implements FR-CHECKLIST-01, FR-CHECKLIST-02,
TC-PURE-01, BC-HONESTY-01.

#### Scenario: Same input yields same output
- **WHEN** `checklistItem` is called twice with identical `requirement` and `cvProfile`
- **THEN** it returns the identical `{ status, rationale }` both times, with no I/O or LLM call

#### Scenario: Status is one of the fixed set
- **WHEN** any requirement is evaluated against a CV profile
- **THEN** `status` is exactly one of `met`, `partial`, `info`, `gap`, or `overclaim-risk` (FR-CHECKLIST-02)

#### Scenario: Coverable requirement resolves to info, not gap
- **WHEN** a requirement has no grounded keyword and no claimed-only keyword, but adjacent CV evidence plausibly covers it
- **THEN** the status is `info`, not `gap`

#### Scenario: True gap is unchanged
- **WHEN** a requirement has no grounded keyword, no claimed-only keyword, and no adjacent CV evidence that could cover it
- **THEN** the status is `gap`, never `info`

#### Scenario: Overclaim still wins over info
- **WHEN** a requirement's only match is a skill claimed as a bare token with no prose support and no grounded keyword
- **THEN** the status is `overclaim-risk`, never `info`

### Requirement: Grounded rationale
The system SHALL attach to each checklist item a single-sentence rationale in
Ukrainian, ≤100 characters, with no emoji, stating which part of the CV supports
or contradicts the requirement. For an `info` item the rationale SHALL be framed
as an improvement suggestion (e.g. covering the point in a cover letter) and
SHALL name the adjacent CV evidence it is built on — it SHALL NOT read as a
failure or a missing skill. Implements FR-CHECKLIST-03, BC-HONESTY-01.

#### Scenario: Rationale references CV evidence
- **WHEN** a requirement is marked `met` or `partial`
- **THEN** the rationale names the supporting experience/skill drawn only from the candidate's CV text

#### Scenario: Info rationale is a suggestion grounded in adjacent evidence
- **WHEN** a requirement is marked `info`
- **THEN** the rationale is a one-sentence Ukrainian improvement suggestion that names the adjacent CV evidence and does not read as a gap or missing skill

#### Scenario: Rationale format constraints
- **WHEN** a rationale is produced
- **THEN** it is one Ukrainian sentence, ≤100 characters, and contains no emoji

### Requirement: Weighted match score
The system SHALL compute an overall match score from 0 to 100, weighting
`must-have` requirements above `nice-to-have`, and display it as a headline above
the checklist. An `info` item SHALL contribute partial credit — strictly greater
than a `gap` (0) and strictly less than a `partial` — so a coverable requirement
scores above a true absence without being counted as met. Implements FR-CHECKLIST-04.

#### Scenario: Must-have weighting
- **WHEN** two profiles differ only in that one meets a `must-have` and the other meets an equivalent `nice-to-have`
- **THEN** the profile meeting the `must-have` receives the higher match score

#### Scenario: Info scores above gap and below partial
- **WHEN** two otherwise-identical profiles differ only in that one requirement is `info` for one profile and `gap` for the other
- **THEN** the `info` profile scores strictly higher; and an `info` item contributes strictly less credit than the same requirement scored `partial`

#### Scenario: Score bounds
- **WHEN** the match score is computed for any input
- **THEN** the result is an integer in the range 0–100 inclusive

## ADDED Requirements

### Requirement: Info status is surfaced as blue improvement suggestion
The system SHALL render an `info` checklist row visually as a blue/info
improvement suggestion — distinct from the red `gap` "missing" treatment and
from the orange `overclaim-risk` treatment — using an approved design token (no
new brand hue), keeping a visible focus style and accessible name. Its copy
SHALL be Ukrainian-first via `shared/lib/i18n` with an English fallback.
Implements FR-CHECKLIST-02, FR-CHECKLIST-03, NFR-I18N-01, NFR-A11Y-01.

#### Scenario: Info row is blue, not red
- **WHEN** the checklist panel renders a row whose status is `info`
- **THEN** it is styled as a blue suggestion with its suggestion rationale, not as a red `gap` row

#### Scenario: Localized suggestion copy
- **WHEN** the checklist renders in Ukrainian (default) or the English fallback
- **THEN** the `info` label and suggestion copy come from `shared/lib/i18n`, with no hardcoded string in the widget
