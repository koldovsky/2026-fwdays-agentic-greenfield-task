# checklist (delta)

## MODIFIED Requirements

### Requirement: Deterministic checklist status
The system SHALL expose `checklistItem(requirement, cvProfile, careerStage?)`
as a pure function in `shared/lib/scoring/checklist.ts` with no `next/*` and no
DOM access, returning `{ status, rationale }` from the fixed status set `met`,
`partial`, `info`, `gap`, `overclaim-risk`. A requirement keyword SHALL count
as covered when any of the following deterministic checks passes: it is
grounded in a CV sentence; it is grounded via the synonym/alias table; it is a
duration requirement satisfied by summed tenure; or, for an inferred
`careerStage` of `mid` or `senior` only, it appears in the CV skills list
(claimed-covered). Aggregation stays: all keywords covered yields `met`, at
least one yields `partial`; coverage broadening is the only softening of the
former all-keywords verbatim AND, and no uncovered keyword is ever credited.
For `junior` careerStage, and whenever careerStage is absent or unknown, the
strict rule SHALL hold: a requirement whose only match is a bare skills-list
token scores `overclaim-risk`. The `info` and `gap` semantics are unchanged,
and `info` SHALL NOT override `overclaim-risk`. Implements FR-CHECKLIST-01,
FR-CHECKLIST-02, TC-PURE-01, BC-HONESTY-01, BC-HONESTY-02.

#### Scenario: Same input yields same output
- **WHEN** `checklistItem` is called twice with identical `requirement`, `cvProfile`, and `careerStage`
- **THEN** it returns the identical `{ status, rationale }` both times, with no I/O or LLM call

#### Scenario: Senior skills-list claim counts as covered
- **WHEN** careerStage is `senior` and a requirement keyword appears only in the CV skills list, not in any sentence
- **THEN** the keyword counts as claimed-covered and the status is `met` or `partial`, not `overclaim-risk`

#### Scenario: Junior keeps the strict overclaim rule
- **WHEN** careerStage is `junior` and a requirement's only match is a bare skills-list token with no prose support
- **THEN** the status is `overclaim-risk`, exactly as before

#### Scenario: Unknown seniority defaults strict
- **WHEN** careerStage is absent (the optional infer-seniority step failed or was skipped) and a requirement's only match is a skills-list token
- **THEN** the status is `overclaim-risk`; relaxation never applies without a positive `mid`/`senior` inference

#### Scenario: Alias match grounds a keyword
- **WHEN** a requirement keyword has a synonym in the alias table (e.g. "k8s" for "kubernetes") and that synonym appears in a CV sentence
- **THEN** the keyword counts as grounded and contributes to `met`/`partial` deterministically

#### Scenario: No coverage without evidence
- **WHEN** a requirement keyword is not grounded, not alias-grounded, not tenure-satisfied, and not claimed-covered under a `mid`/`senior` stage
- **THEN** the keyword contributes nothing to `met`/`partial`; softening never credits an uncovered keyword (BC-HONESTY-01)

### Requirement: Grounded rationale
The system SHALL attach to each checklist item a single-sentence rationale in
Ukrainian, no more than 100 characters, no emoji, stating which part of the CV
supports or contradicts the requirement. When a status was reached via
claimed-covered skills-list evidence, alias grounding, or summed tenure, the
rationale SHALL name that evidence honestly (the skills-list token, the matched
synonym, or the computed tenure), never presenting relaxed evidence as prose
proof. `info` rationale rules are unchanged. Implements FR-CHECKLIST-03,
BC-HONESTY-01, NFR-I18N-01.

#### Scenario: Claimed-covered rationale discloses the skills-list source
- **WHEN** a `mid`/`senior` requirement scores `met` or `partial` via a skills-list token only
- **THEN** the rationale names the skills-list token as the source, not a CV sentence

#### Scenario: Tenure rationale states the computed duration
- **WHEN** a duration requirement is satisfied by summed tenure
- **THEN** the rationale states the tenure drawn from the CV date ranges, in one Ukrainian sentence of at most 100 characters

## ADDED Requirements

### Requirement: Tenure satisfies duration requirements
The system SHALL parse role date ranges from the CV into the sectioned
`CvDocument` (entity `cv-profile`, pure, TC-PURE-01), sum non-overlapping
tenure deterministically, and use the sum to evaluate duration requirements
(e.g. "3+ years of backend development") that verbatim keyword matching can
never satisfy. Tenure evidence SHALL only ever upgrade a status that the
candidate's own dated roles support; unparseable dates contribute zero tenure
and SHALL never fail the tailoring. Implements FR-CHECKLIST-01,
FR-CHECKLIST-04, TC-PURE-01, BC-HONESTY-01.

#### Scenario: Duration requirement met by summed tenure
- **WHEN** a requirement asks for "3+ years" of an area and the CV's parsed role ranges in that area sum to 4 years
- **THEN** the duration keyword counts as covered and the requirement can score `met`/`partial`

#### Scenario: Insufficient tenure does not upgrade
- **WHEN** the summed relevant tenure is below the requirement's stated duration
- **THEN** tenure contributes no coverage and the status falls through to the remaining deterministic rules

#### Scenario: Unparseable dates fail soft
- **WHEN** a CV contains no parseable date ranges
- **THEN** tenure is zero, no duration requirement is upgraded, and scoring completes normally with no error

### Requirement: Flagged LLM coverage judge
The system SHALL support an optional coverage judge behind a feature flag that
is OFF by default and SHALL remain off until `ANTHROPIC_API_KEY` is configured
and the honesty-eval fixtures for the judge pass. When enabled, the judge makes
exactly one batched LLM call per tailoring (NFR-COST-01) that receives ONLY the
CV text and the extracted requirements, and returns a per-requirement coverage
verdict (`covered` / `adjacent` / `uncovered`), each verdict citing verbatim CV
evidence. The checklist scorer SHALL remain deterministic over that cited
evidence: a verdict whose citation is not present in the CV text SHALL be
discarded and the requirement scored by the heuristic path. Every status
upgrade off `gap` SHALL require cited CV evidence; score inflation is treated
as a failure equal to overclaiming. The judge's context keys SHALL be added to
the `GROUNDING_FORBIDDEN` denylist (`shared/lib/evals/trajectory.ts`) so the
judge can never feed the bullet grounding pass, and overclaim detection
(FR-BULLETS-03, BC-HONESTY-02) cannot be disabled by any judge verdict. This
relaxes FR-CHECKLIST-01, for the flagged path only, to a deterministic scorer
over LLM-cited, CV-grounded evidence (PRD amendment, see proposal). Implements
FR-CHECKLIST-01, FR-CHECKLIST-02, BC-HONESTY-01, BC-HONESTY-02, NFR-COST-01,
NFR-PERF-02.

#### Scenario: Flag off means no judge call
- **WHEN** the coverage-judge flag is off (the default)
- **THEN** no judge LLM call is made and the checklist is produced entirely by the pure heuristic path

#### Scenario: Judge verdict with cited evidence upgrades deterministically
- **WHEN** the flag is on and the judge marks a requirement `covered` with a citation that appears verbatim in the CV text
- **THEN** the deterministic scorer upgrades that requirement using the cited evidence, and the rationale names it

#### Scenario: Uncited or fabricated evidence is discarded
- **WHEN** the judge returns a verdict whose citation does not appear in the CV text
- **THEN** the verdict is discarded, the requirement is scored by the heuristic path, and no upgrade occurs (BC-HONESTY-01)

#### Scenario: Judge failure falls back honest
- **WHEN** the flag is on and the judge call fails or returns unparseable output
- **THEN** the tailoring proceeds on the heuristic path with no error surfaced as a blank and no score fabricated (NFR-OBS-01)

#### Scenario: Judge never reaches the grounding pass
- **WHEN** a tailoring runs with the judge enabled
- **THEN** the recorded grounding-pass context contains none of the judge's context keys; the trajectory eval fails any trace where a judge key appears in grounding (BC-HONESTY-01, FR-BULLETS-03)

#### Scenario: Overclaim detection cannot be disabled
- **WHEN** the judge marks `covered` a requirement whose bullet later fails the two-pass grounding check
- **THEN** the bullet is still flagged `overclaim-risk` and excluded from export by default; no judge verdict overrides FR-BULLETS-02 (BC-HONESTY-02)
