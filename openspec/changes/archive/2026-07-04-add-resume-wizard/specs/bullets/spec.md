## MODIFIED Requirements

### Requirement: Grounding indicator per bullet
The system SHALL attach to every rewritten bullet either a link to its
grounding evidence, or an `overclaim-risk` warning when no supporting
evidence is found. Grounding evidence comes from one of two sources: a
sentence in the candidate's CV, or a confirmed answer to a wizard clarifying
question. Both are honest evidence and both render with the same grounded
status treatment (no separate status color), but the UI SHALL always
visibly distinguish which source backs a given bullet — a user-confirmed
source SHALL NOT be presented as indistinguishable from a CV-sourced one.
Implements FR-BULLETS-01, BC-HONESTY-03.

#### Scenario: CV-sourced bullet is linked
- **WHEN** a rewritten bullet is backed by a sentence in the candidate's CV
- **THEN** the bullet shows a grounding label identifying the evidence as CV-sourced, together with that source sentence

#### Scenario: User-confirmed bullet is linked and visibly distinct
- **WHEN** a rewritten bullet is backed by a confirmed answer to a wizard clarifying question
- **THEN** the bullet shows a grounding label identifying the evidence as user-confirmed, together with the clarifying question and the confirmed answer, rendered with the same grounded status as a CV-sourced bullet but a visibly different label text

#### Scenario: Unsupported bullet is warned
- **WHEN** a rewritten bullet has no supporting evidence in either the CV or the confirmed-answers pool
- **THEN** the bullet is marked `overclaim-risk` with a visible warning and no grounding source line is shown
