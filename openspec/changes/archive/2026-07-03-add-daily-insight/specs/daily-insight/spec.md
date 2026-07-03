## ADDED Requirements

### Requirement: Daily insight for today from recent history

The system SHALL produce a short, natural-language insight about the user's **current local
day** — pace, patterns, and likely progress — derived from their tracked-time history over the
**last 14 local days**. The insight SHALL be a single plain-English sentence suitable for a
calm at-a-glance read. (FR-INSIGHT-01)

#### Scenario: Insight reflects recent tracking

- **WHEN** a user with tracked time over the past two weeks opens the Stats screen
- **THEN** the insight card shows one short sentence about today's pace relative to that recent
  history

#### Scenario: New user with little or no history

- **WHEN** a user has no meaningful tracked time in the last 14 days
- **THEN** the card still shows a calm, sensible sentence (e.g., an encouragement to start)
  rather than an error or a blank space

### Requirement: Insight is generated server-side via the Anthropic API

The insight SHALL be generated on the **NestJS backend** by calling the **Anthropic API**
(TC-STACK-07). The Anthropic API key SHALL be read only from server configuration and SHALL
NEVER be exposed to or used by the mobile client (FR-INSIGHT-02). The client SHALL obtain the
insight solely through the authenticated API.

#### Scenario: Generation happens on the server

- **WHEN** the client requests today's insight
- **THEN** the server (not the client) calls the LLM and returns only the resulting sentence and
  its metadata

#### Scenario: API key never reaches the client

- **WHEN** the mobile app is inspected (bundle, network traffic, storage)
- **THEN** no Anthropic API key is present; the key exists only in server configuration

### Requirement: The model receives a pre-computed numeric summary, never raw rows

The LLM SHALL be given a **pre-computed numeric summary** of the user's history — totals,
per-day series, and per-tag breakdown — and SHALL NOT receive raw time-entry rows or free-text
notes (FR-INSIGHT-04). The summary SHALL be produced by a pure, framework-free shaping function
computed in the **user's local time zone**.

#### Scenario: Only aggregates are sent to the model

- **WHEN** the server builds the LLM request
- **THEN** the prompt contains only numeric aggregates (day series, totals, top-tag totals) and
  no raw entries, ids, or note text

#### Scenario: Summary uses the user's local day boundaries

- **WHEN** the summary is shaped for a user in a given time zone
- **THEN** each entry is attributed to its local start day in that time zone, so "today" and the
  14-day window match what the user sees on the Stats screen

### Requirement: Insight is cached per user per local day

The system SHALL cache the generated insight **per user per local day** and serve the cached
value for subsequent requests on the same local day, generating **at most one** insight per user
per day unless the user explicitly refreshes (FR-INSIGHT-03, NFR-COST-01). An explicit refresh
SHALL regenerate and replace that day's cached insight.

#### Scenario: Second request the same day is served from cache

- **WHEN** a user requests today's insight after it has already been generated today
- **THEN** the cached sentence is returned without another LLM call

#### Scenario: A new local day generates a fresh insight

- **WHEN** the user's local day rolls over and they request the insight
- **THEN** a new insight is generated and cached for the new day

#### Scenario: Explicit refresh regenerates once

- **WHEN** the user taps refresh on the insight card
- **THEN** the server regenerates today's insight and replaces the cached value

### Requirement: Output is constrained in length and tone

The generated sentence SHALL be **≤ 200 characters**, in **English**, contain **no emojis**, and
SHALL NOT introduce figures that are not present in the numeric summary (no invented numbers)
(FR-INSIGHT-05). Output that violates a hard constraint SHALL be corrected or replaced by the
deterministic fallback rather than shown as-is.

#### Scenario: Over-long or emoji output is not shown

- **WHEN** the model returns text over 200 characters or containing emojis
- **THEN** the server trims/sanitizes to satisfy the constraints, or substitutes the
  deterministic fallback, so the card never shows a violating string

#### Scenario: Fabricated figures rejected

- **WHEN** the model output contains a number absent from the numeric summary
- **THEN** the server rejects that output and serves the deterministic fallback instead

### Requirement: Deterministic fallback guarantees a non-empty insight

On LLM timeout, error, disabled/missing API key, or guardrail rejection, the system SHALL return
a **deterministic templated insight** computed purely from the numeric summary, so the feature
never errors or shows a blank card (FR-INSIGHT-06, NFR-OBS-01). The response SHALL indicate
whether the insight came from the model or the fallback.

#### Scenario: LLM failure degrades to fallback

- **WHEN** the Anthropic call times out or fails
- **THEN** the server returns the deterministic fallback sentence for the summary and marks the
  source as `fallback`

#### Scenario: No API key configured

- **WHEN** the server has no Anthropic API key configured
- **THEN** requests transparently return the deterministic fallback without attempting an LLM call

### Requirement: Insight-input shaping and fallback are pure and unit-tested

The system SHALL implement insight-input shaping (history into a numeric summary) and the
deterministic fallback template (summary into a sentence) in `packages/shared` as **pure,
framework-free** functions with no Nest, Prisma, or React Native imports. These functions MUST
be covered by an evals-style unit suite over fixtures asserting the summary shape and the
fallback constraints (TC-PURE-01, TC-TEST-01).

#### Scenario: Deterministic under test

- **WHEN** the shaping and fallback functions run against fixtures with a fixed `now` and time zone
- **THEN** they produce the same summary and the same fallback sentence every time, and the
  fallback satisfies the ≤ 200-char / English / no-emoji / no-invented-figure constraints

### Requirement: Insight endpoints are authenticated and user-scoped

Every insight endpoint SHALL require a valid access token and operate only on the authenticated
user's own history and cache; a user MUST never read or trigger another user's insight
(FR-AUTH-06, BC-SCOPE-01).

#### Scenario: Unauthenticated request rejected

- **WHEN** an insight endpoint is called without a valid access token
- **THEN** the API responds with 401 Unauthorized

#### Scenario: Insight is scoped to the caller

- **WHEN** an authenticated user requests their insight
- **THEN** the summary and cache used are derived only from that user's own entries

### Requirement: Stats screen shows the insight with calm states

The mobile Stats screen SHALL present the insight as a card showing the sentence and a refresh
control, using design tokens only (FR-THEME-03). It SHALL show a calm loading state while
generating, degrade to the fallback (never an error toast) on failure, and remain readable in
both light and dark themes (NFR-OBS-01, NFR-A11Y-02).

#### Scenario: Loading then content

- **WHEN** the insight is being fetched or generated
- **THEN** the card shows a calm loading state and then the sentence when ready

#### Scenario: Refresh from the card

- **WHEN** the user taps the card's refresh control
- **THEN** the app requests a regenerated insight and updates the card with the new sentence
