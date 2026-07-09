# paywall (delta)

## MODIFIED Requirements

### Requirement: Free-tier lifetime cap enforced at run start, not completion

The system SHALL increment the free-tier usage counter for a logged-in free user
at the moment a `pending` tailoring row is created (before the LLM call), not
after the result is delivered. A reservation is taken atomically before any
generation work begins. The reservation is released only when the run ends with a
clean, deterministic failure (LLM error, parse failure, validation rejection)
before any LLM tokens are consumed. A run that starts generation and is then
abandoned (browser close, network drop, timeout) SHALL NOT release the
reservation: the pending row becomes the durable record of that consumed slot, and
the TTL cleanup (see `tailoring-history` spec) eventually marks it `failed` without
releasing the counter. This closes the window where a user could probe the system
by intentionally abandoning runs. Implements FR-ONBOARD-01, FR-PAYWALL-01,
NFR-COST-02.

#### Scenario: Free user's second tailoring is blocked before LLM is called

- **WHEN** a logged-in free-tier user who has one existing `complete` or
  non-released-`pending` tailoring submits a new request
- **THEN** the usage-counter gate rejects the request before any LLM call is made,
  the response is a calm `rate_limited` error event, and no pending row is created
  for that attempt

#### Scenario: Clean pre-LLM failure releases the reservation

- **WHEN** a logged-in free-tier user's request fails during input validation or
  job-description parse before any LLM token is requested
- **THEN** the usage counter reservation is released and the user retains their
  remaining free tailorings

#### Scenario: Abandoned mid-run does not release the reservation

- **WHEN** a logged-in free-tier user's generation run starts (LLM call begins)
  but the client disconnects before a `result` event is emitted
- **THEN** the usage counter reservation is not released, the pending row remains
  until the TTL cleanup marks it `failed`, and the user's remaining budget is
  reduced by one

#### Scenario: Paid users are never gated

- **WHEN** an account with an active paid subscription submits any number of
  tailorings
- **THEN** none are blocked by the usage-counter gate at any lifecycle step

#### Scenario: Counter increment timing aligns with pending row

- **WHEN** the pending row creation succeeds and the counter increment fails
- **THEN** the tailoring run proceeds (best-effort on persistence, NFR-OBS-01) and
  the partial state is logged server-side; the pending row exists as an observable
  audit record even without the counter increment
- **AND** the converse: if the counter increment succeeds and the pending row
  creation fails, the run proceeds, the counter increment is not rolled back (it
  will be corrected at the next TTL cleanup pass), and the failure is logged
