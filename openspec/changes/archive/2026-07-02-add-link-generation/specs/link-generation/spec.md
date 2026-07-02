## ADDED Requirements

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
