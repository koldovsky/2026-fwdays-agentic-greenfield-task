# Footer sayings — implementation delta

Implements the baseline capability. Requirements below match
`openspec/specs/footer-sayings/spec.md`; no behavioural change from baseline.

## ADDED Requirements

### Requirement: Deterministic daily saying (FR-SAYINGS-01)
The footer SHALL show a Ukrainian money one-liner chosen deterministically by
day-of-year, with no external API and no tracking, and no exclamation marks.

#### Scenario: Same day shows the same saying
- **WHEN** the page is opened twice on the same calendar day
- **THEN** the same footer saying is shown both times

#### Scenario: Saying follows the brand voice
- **WHEN** a saying is shown
- **THEN** it is Ukrainian, calm, and contains no exclamation marks
