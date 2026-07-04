## MODIFIED Requirements

### Requirement: Grounding is a separate LLM pass
The system SHALL perform the grounding check as a second LLM pass with its own
stricter system prompt that does not share context with the generation pass. The
grounding pass's context SHALL remain limited to exactly the candidate's CV
sentences and the confirmed clarifying-question answers — the two honest
evidence sources. Neither the inferred seniority (career stage + its rationale)
nor any cover-letter prompt or output SHALL be added to the grounding pass's
context: seniority calibrates tone in generation only, and the cover letter is a
downstream artifact, so allowing either into grounding would create an overclaim
backdoor. The isolation MAY only widen (exclude more), never loosen. Implements
FR-BULLETS-03, BC-HONESTY-01, BC-HONESTY-03.

#### Scenario: Independent grounding pass
- **WHEN** a tailoring is generated
- **THEN** grounding runs as a distinct LLM call whose prompt and context are separate from the generation call

#### Scenario: No fabricated skills emitted as grounded
- **WHEN** the generation pass proposes a skill or number absent from the CV
- **THEN** the grounding pass flags it as `overclaim-risk` rather than presenting it as grounded

#### Scenario: Seniority is not a grounding input
- **WHEN** the pipeline has inferred a career stage upstream
- **THEN** the grounding pass's serialized prompt is byte-unchanged versus a run with no seniority verdict, and the grounding step's recorded context keys contain neither the seniority nor the cover-letter context

#### Scenario: Seniority cannot back a bullet as evidence
- **WHEN** a bullet's only would-be support is the inferred career stage rather than a CV sentence or a confirmed answer
- **THEN** the grounding pass marks it `overclaim-risk`, never `grounded`
