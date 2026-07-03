# bullets

## Purpose

Grounded rewritten résumé bullets. Every bullet is either linked to a source
sentence in the candidate's CV or flagged `overclaim-risk` and excluded from
export by default. Grounding is a separate, stricter second LLM pass. This is the
product's core differentiator. Traces: FR-BULLETS-01/02/03, BC-HONESTY-01/02.

## Requirements

### Requirement: Grounding indicator per bullet
The system SHALL attach to every rewritten bullet either a link to the source
sentence in the CV, or an `overclaim-risk` warning when no supporting evidence is
found. Implements FR-BULLETS-01.

#### Scenario: Supported bullet is linked
- **WHEN** a rewritten bullet is backed by a sentence in the candidate's CV
- **THEN** the bullet shows a grounding link to that source sentence

#### Scenario: Unsupported bullet is warned
- **WHEN** a rewritten bullet has no supporting evidence in the CV
- **THEN** the bullet is marked `overclaim-risk` with a visible warning

### Requirement: Overclaim excluded from export by default
The system SHALL exclude `overclaim-risk` bullets from export by default; the
user MUST actively acknowledge the risk to opt one back in, and it can never be
silently re-included. This behavior cannot be disabled. Implements FR-BULLETS-02, BC-HONESTY-02.

#### Scenario: Default export omits overclaim
- **WHEN** the user exports without acting on an `overclaim-risk` bullet
- **THEN** that bullet is absent from the exported résumé

#### Scenario: Explicit acknowledgement required
- **WHEN** the user opts an `overclaim-risk` bullet back into the export
- **THEN** the system requires an explicit acknowledgement click before including it

### Requirement: Grounding is a separate LLM pass
The system SHALL perform the grounding check as a second LLM pass with its own
stricter system prompt that does not share context with the generation pass.
Implements FR-BULLETS-03, BC-HONESTY-01.

#### Scenario: Independent grounding pass
- **WHEN** a tailoring is generated
- **THEN** grounding runs as a distinct LLM call whose prompt and context are separate from the generation call

#### Scenario: No fabricated skills emitted as grounded
- **WHEN** the generation pass proposes a skill or number absent from the CV
- **THEN** the grounding pass flags it as `overclaim-risk` rather than presenting it as grounded
