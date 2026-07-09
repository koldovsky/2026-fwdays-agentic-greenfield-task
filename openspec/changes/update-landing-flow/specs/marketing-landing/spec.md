# marketing-landing (delta)

## MODIFIED Requirements

### Requirement: Static honest demo
The system SHALL show a static, example-data demo of a tailored result: at least
one grounded ("Vouched") bullet linked to CV evidence and one `overclaim-risk`
bullet marked as excluded from export, plus a checklist with rows in the met,
coverable (blue info), partial, gap, and overclaim-risk states and a numeric
match score. The coverable state SHALL reuse the existing brand-blue token (no
new hue) and SHALL read as an opportunity to address in a cover letter, distinct
from a red gap. The demo SHALL require no sign-in and issue no network call.
Implements FR-SALES-02, FR-CHECKLIST-02.

#### Scenario: Demo shows grounded and overclaim examples
- **WHEN** the landing page renders the demo and checklist
- **THEN** a Vouched bullet and an overclaim-risk (excluded) bullet are both visible
- **AND** the checklist shows the five status states (met, coverable, partial, gap, overclaim-risk) with a match score, using only static example data

#### Scenario: Coverable state is distinct from a gap
- **WHEN** the checklist renders a coverable (info) requirement
- **THEN** it is shown in the brand-blue token, not the red gap/overclaim color
- **AND** its rationale frames it as coverable in a cover letter, not as a missing requirement

## ADDED Requirements

### Requirement: Landing represents the full export flow
The landing page SHALL represent the tailoring outputs that ship today: the
grounded resume export, the grounded cover-letter export, and saved tailoring
history for signed-in paid users. The how-it-works section SHALL name the
cover-letter export and history as flow outputs, and the FAQ SHALL answer at
least one question about cover letters and/or saved history. The page SHALL NOT
advertise capabilities that are not yet built. Implements FR-SALES-01,
FR-COVERLETTER-01, FR-HISTORY-01.

#### Scenario: Cover letter and history are represented
- **WHEN** an anonymous visitor reads the how-it-works and FAQ sections
- **THEN** the cover-letter export and saved history are described as available outputs of the flow
- **AND** no unbuilt capability (e.g. attaching an original PDF to the request) is advertised

### Requirement: Problem-first hero framing
The hero SHALL lead with the reader's problem — generic AI tools that fabricate
experience the candidate then has to defend — before positioning Vouch as the
honest alternative, while keeping a single primary CTA into the free flow and the
"first tailoring is free, no account needed" risk-reducer. Implements FR-SALES-01.

#### Scenario: Hero leads with the problem
- **WHEN** an anonymous visitor reads the hero
- **THEN** the opening copy names the broken status quo before naming Vouch
- **AND** the primary CTA still routes to `/tailor` without requiring sign-in
