## ADDED Requirements

### Requirement: Stripe provider selection behind the port
The system SHALL support selecting a Stripe (sandbox) payments provider via
`PAYMENTS_PROVIDER=stripe`, resolved at the app edge through the existing
`PaymentsProvider` port so the rest of the app is unaware of the concrete
provider. The emulator SHALL remain the default. When `stripe` is selected but a
required key (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) is unset, resolution
SHALL throw a clear configuration error rather than build a broken adapter.
Implements TC-STACK-06.

#### Scenario: Stripe adapter is selected
- **WHEN** `PAYMENTS_PROVIDER=stripe` and the Stripe keys are configured
- **THEN** `resolvePaymentsProvider` returns the Stripe adapter and every payments call goes through it

#### Scenario: Missing key fails loudly
- **WHEN** `PAYMENTS_PROVIDER=stripe` but `STRIPE_SECRET_KEY` is unset
- **THEN** provider resolution throws a clear configuration error and no checkout is attempted

#### Scenario: Default stays the emulator
- **WHEN** `PAYMENTS_PROVIDER` is unset in local dev
- **THEN** the emulator adapter is used, unchanged

### Requirement: Stripe checkout session
The Stripe adapter's `createCheckout` SHALL create a Stripe Checkout Session in
subscription mode for the chosen plan (Pro or Job-hunt Pass) and return its
hosted URL, so no card data ever reaches Vouch servers. The `returnTo` URL SHALL
be validated against an allowlisted origin before use (no open redirect).
Implements FR-PAYWALL-02.

#### Scenario: Checkout returns a hosted Stripe URL
- **WHEN** a signed-in user starts checkout for a plan
- **THEN** the adapter returns a Stripe-hosted checkout URL for that plan and no card data is handled by Vouch

#### Scenario: Untrusted return URL is rejected
- **WHEN** a checkout request supplies a `returnTo` outside the allowlisted origin
- **THEN** the request is rejected and no session is created

### Requirement: Signature-verified idempotent webhook
The Stripe webhook route SHALL read the raw request body and verify the event
with `stripe.webhooks.constructEvent(rawBody, signatureHeader, STRIPE_WEBHOOK_SECRET)`,
rejecting a missing or invalid signature with 400 — a custom HMAC path SHALL NOT
be used. A verified subscription-lifecycle event SHALL sync the `subscriptions`
table, and a repeated event id (Stripe retry) SHALL be a no-op returning 200
(idempotency, no double application). Apply failures SHALL log server-side and
return a calm coded error, never a raw 500. Implements FR-PAYWALL-03,
FR-BILLING-01, NFR-OBS-01.

#### Scenario: Valid event syncs subscription
- **WHEN** a webhook arrives with a valid Stripe signature for a subscription-activated event
- **THEN** the signature verifies and the user's `subscriptions` row is updated to the active plan

#### Scenario: Forged signature is rejected
- **WHEN** a webhook arrives with a missing or invalid `Stripe-Signature`
- **THEN** the route returns 400 and no subscription state changes

#### Scenario: Retry is idempotent
- **WHEN** the same Stripe event id is delivered more than once
- **THEN** the second delivery is a no-op and the subscription state is applied at most once

### Requirement: Cancellation via Stripe
The adapter's `cancel` SHALL request cancellation of the user's Stripe
subscription at period end; the resulting state change SHALL arrive through the
verified webhook path and downgrade the user to Free at the end of the current
period, keeping existing tailorings readable while gating export. Implements
FR-BILLING-02.

#### Scenario: Cancel downgrades at period end
- **WHEN** a paid user cancels
- **THEN** Stripe schedules cancellation at period end and, once the webhook confirms it, the subscription downgrades to Free while past tailorings stay readable

### Requirement: Server-only secret handling
The Stripe secret key SHALL be read only in server code and SHALL NOT be importable
into or bundled with any client component; only the publishable key
(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) is client-safe. No Stripe secret SHALL be
logged. Implements NFR-SEC-02.

#### Scenario: Secret key stays server-side
- **WHEN** the client bundle is built
- **THEN** it contains no Stripe secret key and no `STRIPE_SECRET_KEY` reference
