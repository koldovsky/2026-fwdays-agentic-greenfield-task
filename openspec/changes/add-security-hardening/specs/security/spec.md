## ADDED Requirements

### Requirement: Security headers on every response
The system SHALL set standard security response headers — a Content Security Policy,
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a `Referrer-Policy`, and a
`Permissions-Policy` — on every response, including the public auth and tailor endpoints, without
breaking loaded fonts or styles. Implements NFR-SEC-03.

#### Scenario: Headers present on the landing page
- **WHEN** a client requests any page or route of the app
- **THEN** the response includes `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a
  `Referrer-Policy`, a `Permissions-Policy`, and a Content-Security-Policy header

#### Scenario: CSP does not break the product's own assets
- **WHEN** the landing page loads its `next/font` Google Fonts and Tailwind-generated styles
- **THEN** no resource is blocked by the Content-Security-Policy and no CSP violation is reported

### Requirement: Per-IP rate limiting on public unauthenticated endpoints
The system SHALL rate-limit `POST /api/tailor` and `POST /api/auth/register` per client IP address
using a sliding window, and SHALL reject requests over the limit calmly — never with a raw
exception and never by silently dropping the connection. Implements NFR-SEC-04.

#### Scenario: Anonymous caller over the per-IP window
- **WHEN** an anonymous caller submits `POST /api/tailor` more than once from the same IP within
  the rate-limit window
- **THEN** the second request's stream emits a `rate_limited` error event followed by a `failed`
  status, the LLM is never called, and the response is a normal 200 NDJSON stream (not a raw 429)

#### Scenario: Rejected request is not charged
- **WHEN** a request is rejected by the rate limiter or the usage-counter gate
- **THEN** no usage counter or rate-limit entry is incremented for that request

### Requirement: Honeypot bot-resistance on public forms
The system SHALL include a hidden honeypot field on the tailoring form and the sign-up form, and
SHALL silently no-op a submission where that field is non-empty — never surfacing an error or any
signal that detection occurred. Implements NFR-SEC-04.

#### Scenario: Honeypot filled on the tailoring form
- **WHEN** the hidden `website` field on `TailoringForm` is non-empty at submit time
- **THEN** the form never calls the tailoring API and shows no error, success, or other signal
  distinguishing this from a normal submission to the caller

#### Scenario: Honeypot filled on sign-up
- **WHEN** the hidden `website` field on `SignInForm`'s sign-up mode is non-empty at submit time
- **THEN** the form never calls the register API and shows no error

### Requirement: Free-tier usage limits are enforced
The system SHALL enforce the free-tier tailoring limits — one lifetime tailoring for an anonymous
visitor, two lifetime tailorings for a logged-in free account, unlimited for a paid account —
using the existing `usage-counter` entity's gating logic, backed by durable per-user counts for
logged-in users. A failed or retried attempt SHALL NOT consume the limit; only a completed
successful tailoring SHALL. Implements NFR-COST-02.

#### Scenario: Anonymous visitor's second tailoring is blocked
- **WHEN** an anonymous visitor who has already completed one successful tailoring submits another
- **THEN** the request is rejected with the calm `rate_limited` error before the LLM is called

#### Scenario: Logged-in free account's third tailoring is blocked
- **WHEN** a logged-in free-tier user who has completed two successful tailorings submits a third
- **THEN** the request is rejected with the calm `rate_limited` error before the LLM is called

#### Scenario: A failed run does not consume the budget
- **WHEN** a logged-in free-tier user's tailoring run fails (e.g. the LLM call errors) before
  producing a result
- **THEN** their usage counter is not incremented and they retain their remaining free tailorings

#### Scenario: Paid accounts are never gated
- **WHEN** an account with an active paid subscription submits any number of tailorings
- **THEN** none are blocked by the usage-counter gate
