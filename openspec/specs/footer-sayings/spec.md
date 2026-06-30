# Footer sayings (optional)

## Purpose
Show a dry, deterministic Ukrainian money one-liner in the footer — a calm grace
note, with no API and no tracking. Deferred (Future); promote to MVP if time allows.

## Requirements

### Requirement: Deterministic daily saying (FR-SAYINGS-01)
The footer SHALL show a Ukrainian money one-liner chosen deterministically by
day-of-year, with no external API and no tracking, and no exclamation marks.

#### Scenario: Same day shows the same saying
- **WHEN** the page is opened twice on the same calendar day
- **THEN** the same footer saying is shown both times

#### Scenario: Saying follows the brand voice
- **WHEN** a saying is shown
- **THEN** it is Ukrainian, calm, and contains no exclamation marks
