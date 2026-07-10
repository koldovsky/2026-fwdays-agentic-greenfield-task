# wizard (delta)

## MODIFIED Requirements

### Requirement: Bounded clarifying questions from requirement keywords
The system SHALL, before generating bullets, derive up to a bounded number of
clarifying questions from the keywords of checklist rows scored `gap` only,
using a deterministic template with no LLM call. Rows scored `partial` are no
longer eligible: they already carry grounded CV evidence, so asking about them
adds friction without honesty value. Prioritization within the bound is
`must-have` gaps first, then original order. This narrows FR-WIZARD-02's
eligibility set from `partial` or `gap` to `gap` (PRD amendment, see proposal);
the bound, the deterministic template, and the no-LLM rule are unchanged.
Implements FR-WIZARD-02, TC-PURE-01.

#### Scenario: Questions derived from gap rows only
- **WHEN** the checklist contains rows scored `gap` and rows scored `partial`
- **THEN** clarifying questions are derived only from the `gap` rows' requirement keywords, and no `partial` row produces a question

#### Scenario: Must-have gaps come first within the bound
- **WHEN** the number of `gap` rows exceeds the configured bound
- **THEN** only the bound number of questions are shown, with `must-have` gaps prioritized before `nice-to-have` gaps

#### Scenario: No gaps, no questions
- **WHEN** every checklist row is scored `met`, `partial`, `info`, or `overclaim-risk`
- **THEN** no clarifying questions are shown and the flow proceeds directly to generation

#### Scenario: Derivation stays deterministic and narrow
- **WHEN** clarifying questions are derived
- **THEN** the derivation makes no LLM call and sees only each eligible row's requirement text, keywords, importance, and status, never the CV, the JD, or the match score
