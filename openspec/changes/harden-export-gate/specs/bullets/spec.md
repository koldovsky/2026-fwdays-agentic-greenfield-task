# bullets (delta)

## ADDED Requirements

### Requirement: Export honesty gate is server-enforced and mandatory

The system SHALL enforce the bullet honesty gate on the server for every
authenticated résumé export (PDF and DOCX), not only in the client. Every bullet
text in the export document SHALL be a member of the set of bullet texts the
tailoring pipeline persisted for the caller's own, `complete` tailoring. The gate
is a text-MEMBERSHIP check, NOT an `included` filter: a legitimately re-included
overclaim-risk bullet (`FR-BULLETS-02`) is allowed because its text was produced
by the pipeline; only text the pipeline never produced is rejected.

The gate SHALL be MANDATORY, not opt-in from the request body: an export that
carries any bullet text MUST name its `tailoringId`. A bullet-bearing export with
a missing, empty, or non-string `tailoringId` SHALL be rejected before rendering.
An export document with no bullet text has nothing to ground and is allowed (the
paywall and shape validation still apply). Profile fields — summary, skills,
education, headline, and contact — are candidate-supplied profile data, not
pipeline-generated claims, and SHALL remain outside the grounding gate.

Ownership SHALL be enforced (a tailoring not owned by the caller is treated
identically to a non-existent one, with no existence leak), and only a `complete`
tailoring's bullets are authoritative. Implements FR-BULLETS-02, FR-BULLETS-03,
BC-HONESTY-02, NFR-SEC-04.

#### Scenario: Crafted POST cannot inject non-pipeline bullet text

- **WHEN** an authenticated paid caller sends an export request whose bullet text
  was never produced by the named tailoring's pipeline run
- **THEN** the server rejects the request before rendering, and no fabricated
  bullet reaches the exported file

#### Scenario: Omitting the tailoringId does not bypass the gate

- **WHEN** an authenticated caller sends a bullet-bearing export with no valid
  `tailoringId` (absent, empty, or non-string)
- **THEN** the server rejects the request (`missing_tailoring`) rather than
  falling back to shape-only validation, so the gate cannot be skipped from the
  request body

#### Scenario: Opted-in overclaim bullet is not stripped by the gate

- **WHEN** the export includes an overclaim-risk bullet the user explicitly opted
  back in, whose text the pipeline persisted for the tailoring
- **THEN** the membership gate allows it (it checks membership, not the `included`
  flag), preserving the FR-BULLETS-02 opt-in

#### Scenario: Bullets from a different tailoring or an incomplete run are rejected

- **WHEN** the named `tailoringId` is owned by a different user, does not exist,
  or has not reached `complete`
- **THEN** the server rejects the export (not-found is indistinguishable from
  not-owned; an incomplete run's bullets are not authoritative)

#### Scenario: Profile fields remain outside the grounding gate

- **WHEN** the export document carries summary, skills, education, or headline text
- **THEN** the grounding gate does not membership-check those fields (they are
  candidate profile data, not pipeline-generated bullet claims)
