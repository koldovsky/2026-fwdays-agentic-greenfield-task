# link-generation

## Purpose

Builds ready-to-click `send.monobank.ua` jar top-up links from
`jar-matching`'s matched results. For each matched jar, constructs
`https://send.monobank.ua/jar/{sendId}?a={amount}` with the plan amount
carried through 1:1 in UAH, no unit conversion (FR-LINK-01). This
capability is pure and does no I/O: it takes matched results in and
returns links out, preserving input order (NFR-DET-01) and never
including the token or any data beyond `sendId` and amount
(NFR-SEC-02, NFR-SEC-04). It sits between `jar-matching` and
`cli-orchestration` in the jarsplit pipeline.

These requirements are implementation-agnostic business rules: the Go CLI
(`internal/linkgen`) and the Android app (`domain/linkgen`, see
`android-client`) each independently satisfy this same contract.

## Requirements

### Requirement: Jar top-up link construction
For each matched result, the system SHALL build a link of the form
`https://send.monobank.ua/jar/{sendId}?a={amount}`, where `{sendId}` is
the matched jar's send identifier and `{amount}` is the plan amount in
UAH, applied 1:1 with no unit conversion.

#### Scenario: Link is built from sendId and amount
- **WHEN** a matched result has `SendID = "4xR2yTk"` and `Amount = 5000`
- **THEN** the generated link is
  `https://send.monobank.ua/jar/4xR2yTk?a=5000`

#### Scenario: Amount is carried through with no conversion
- **WHEN** a matched result has `Amount = 3000`
- **THEN** the link's `a` query parameter is exactly `3000`, not `300000`
  or any other scaled value

### Requirement: Link contains no data beyond sendId and amount
A generated link SHALL contain only the jar `sendId` and the amount. It
SHALL NOT contain the monobank access token or any other account data.

#### Scenario: Generated link has no token
- **WHEN** any link is generated, regardless of how `MONO_TOKEN` was
  obtained
- **THEN** the link string contains no substring of the token value and
  no query parameter other than `a`

### Requirement: Deterministic link order
Generated links SHALL preserve the order of the input matched results,
with no reordering, deduplication, or grouping introduced at this stage.

#### Scenario: Output order mirrors input order
- **WHEN** matched results are given in the order `Подорожі`, then
  `Заощадження`
- **THEN** the generated links appear in that same order
