# link

## Purpose

Each assessment cycle exposes a single private respondent URL `/respond/[token]` that HR
shares manually. The token is the only credential a respondent needs, resolves to exactly
one cycle, carries no personal data, and is not guessable or enumerable. HR copies the link
with a one-click action; the token contract resolves to the cycle's current status, so an
open (`collecting`) cycle loads a respondent session, while a `done`, `expired`, or unknown
token shows a calm explanatory page rather than a stack trace or a generic error. The
landing case is decided by the cycle's `status` enum (`collecting` · `done` · `expired`,
per FR-CYCLE-04), not by re-deriving the deadline. This capability owns the respondent-link
contract (FR-LINK-01..03, BC-PRIVACY-02, NFR-SEC-01).

## Requirements

### Requirement: Private respondent URL with one-click copy

The system SHALL expose, for every cycle, a private respondent URL of the form
`/respond/[token]`, where `[token]` is the cycle's unique token, and SHALL provide HR a
one-click "Copy link" action in the cabinet that copies that full URL to the clipboard. The
copy action SHALL confirm success inline (a transient confirmation) and SHALL never display
the cycle's internal database id, the subject's personal data, or any other cycle's link
(FR-LINK-01, BC-PRIVACY-02).

#### Scenario: HR copies a cycle's respondent link in one click

- **GIVEN** an authenticated HR manager viewing a cycle in the cabinet
- **WHEN** they activate the "Copy link" action for that cycle
- **THEN** the full respondent URL `/respond/<token>` for exactly that cycle is written to
  the clipboard and an inline confirmation (for example "Link copied") is shown, with no
  page navigation and no exposure of the cycle id or the subject's personal data

#### Scenario: Copied link opens the correct respondent session for an open cycle

- **GIVEN** HR has copied the respondent URL for a cycle whose `status` is `collecting`
- **WHEN** the copied URL `/respond/<token>` is opened in a browser
- **THEN** the respondent session for that one cycle loads, with no sign-in required by the
  respondent

### Requirement: Token resolves to exactly one cycle, non-enumerable, no personal data in URL

The system SHALL generate each cycle's token as a high-entropy, cryptographically random,
URL-safe opaque string that is unique across all cycles (the `Cycle.token` column is
unique), so that tokens are not sequential, not derived from the subject or cycle, and not
feasibly enumerable or guessable. Concretely, a cycle token SHALL be 32 cryptographically
random bytes encoded as unpadded base64url, yielding a fixed 43-character string drawn only
from the charset `[A-Za-z0-9_-]` (the same convention as auth refresh tokens). A given token
SHALL resolve to at most one cycle. The token-bearing URL SHALL contain no personal data (no
surname, email, phone, Telegram handle, or subject name) and no internal database id; the
token to employee mapping SHALL live only in the database. Token generation SHALL be pure,
framework-free `lib/` logic that is unit-tested (FR-LINK-02, BC-PRIVACY-02, NFR-SEC-01,
TC-PURE-01).

#### Scenario: Each token maps to exactly one cycle

- **GIVEN** a valid token for a cycle
- **WHEN** the respondent route resolves the token
- **THEN** it loads exactly the one cycle whose `token` equals the supplied value and no
  other cycle's data is reachable through that token

#### Scenario: Tokens are high-entropy and not enumerable

- **GIVEN** the tokens of many cycles
- **WHEN** they are inspected
- **THEN** each is a long, cryptographically random, URL-safe opaque string that is not
  sequential, not derived from the cycle id or subject, and gives no feasible way to guess or
  enumerate another cycle's token

#### Scenario: The URL carries no personal data

- **GIVEN** a respondent URL `/respond/<token>`
- **WHEN** the URL is examined
- **THEN** it contains only the opaque token, with no subject name, surname, email, phone,
  Telegram handle, or internal database id, and the token to employee mapping exists only in
  the database

#### Scenario: Token generation logic is pure and verifiable

- **GIVEN** the framework-free token generator in `lib/`
- **WHEN** it is invoked many times in a unit test
- **THEN** every generated token is exactly 43 characters, matches `^[A-Za-z0-9_-]{43}$`,
  and is unique across the generated set, with no dependency on `next/*`, `react`, or the
  DOM

### Requirement: Calm explanatory page for closed, expired, or unknown tokens

The system SHALL render a calm, plain-language explanatory page when a respondent opens a
token that does not resolve to an open session, namely: a cycle whose `status` is `expired`
(per FR-CYCLE-04, this is the past-deadline-and-incomplete state), a cycle whose `status` is
`done` (the response is already complete), or an unknown token (no cycle matches the token).
The landing decision SHALL be made strictly from the persisted `status` enum value, not by
re-deriving the deadline at request time: a `done` cycle whose `deadline` lies in the past
SHALL still show the completed explanation, never the expired one. This page SHALL state
plainly that the link is no longer active, is already completed, or was not found, and SHALL
NOT reveal a stack trace, a generic framework error, the existence of other cycles, or any
subject personal data. The respondent route SHALL validate the inbound token at the boundary
with Zod, rejecting any value that is not exactly 43 characters matching `^[A-Za-z0-9_-]{43}$`
(FR-LINK-03, FR-CYCLE-04, BC-PRIVACY-02, NFR-OBS-01, TC-VALID-01).

#### Scenario: Unknown token shows a not-found explanation

- **GIVEN** a well-formed token (43 characters, charset `[A-Za-z0-9_-]`) that matches no
  cycle in the database
- **WHEN** a respondent opens `/respond/<unknown-token>`
- **THEN** a calm explanatory page is shown stating the link was not found, with no stack
  trace, no generic error screen, and no disclosure of whether any other cycle exists

#### Scenario: Expired cycle shows an expired explanation

- **GIVEN** a token whose cycle has `status` equal to `expired`
- **WHEN** a respondent opens that link
- **THEN** a calm explanatory page is shown stating the link is no longer active, with no
  stack trace and no answer form rendered

#### Scenario: Done cycle shows a completed explanation

- **GIVEN** a token whose cycle has `status` equal to `done` (regardless of whether its
  `deadline` is in the past or the future)
- **WHEN** a respondent opens that link
- **THEN** a calm explanatory page is shown stating the response is already complete, with no
  answer form rendered, no stack trace, and no expired wording

#### Scenario: Malformed or oversized token never surfaces a raw error

- **GIVEN** a token value in the URL that fails the boundary schema — empty, shorter or
  longer than 43 characters, containing a character outside `[A-Za-z0-9_-]`, or an oversized
  value (for example a 10,000-character string)
- **WHEN** the respondent route receives it
- **THEN** the token is rejected by Zod validation at the boundary before any database lookup
  and the same calm not-found page is shown, never a 500, a stack trace, or a raw exception

## Exclusions

- Automated email or messenger delivery of the respondent link is intentionally
  unsupported in the MVP; the link is delivered by manual copy-to-clipboard only (per PRD
  "Out of scope (MVP)"). Reporting absence of email send is not a defect.
- Token rotation, manual revocation, or regeneration of a cycle's link is intentionally out
  of scope for the MVP; a cycle keeps one token for its lifetime.
- This capability does not define how a cycle's `status` is set or transitioned (who sets
  `collecting`, `done`, or `expired`, or when), deadline setting, or what the respondent does
  after an open token resolves (form fill / AI interview). It only reads the persisted
  `status` to choose the landing; it owns link exposure, the token contract, and the
  closed/expired/unknown landing page.
