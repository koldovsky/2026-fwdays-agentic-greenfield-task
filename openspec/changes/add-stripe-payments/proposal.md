# Add Stripe payments (sandbox)

## Why

Payments today run entirely on the emulator (`add-payments-emulator`): a fake
merchant that self-posts webhooks to a local `/checkout` screen. To take real
(test-mode) payments we need a real provider. Decided 2026-07-04 (user): the
initial provider is **Stripe, sandbox-only**, kept behind the existing
`PaymentsProvider` port so more providers can be added later (`TC-STACK-06`).

Stripe is a payment processor, not a merchant-of-record. EU/UA VAT handling via
a MoR (Paddle / Lemon Squeezy) is a deferred follow-up and explicitly **not** in
scope here — this change is about wiring a working sandbox checkout +
subscription lifecycle behind the port, not about tax compliance for launch.

## What Changes

- Add the `stripe` Node SDK dependency (server-only).
- Add a `stripe` value to `PaymentsProviderName` and a Stripe adapter in
  `shared/lib/payments` that satisfies the existing `PaymentsProvider` port and
  passes the shared provider contract test (`describePaymentsProviderContract`).
- `resolvePaymentsProvider` (factory) branches on `PAYMENTS_PROVIDER=stripe` to
  build the Stripe adapter; the emulator stays the default for local dev.
- `createCheckout` creates a real Stripe Checkout Session (subscription mode) for
  the chosen plan (Pro / Job-hunt Pass, `FR-PAYWALL-02`) and returns its URL.
- The webhook route verifies the Stripe signature with
  `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)` — never a
  custom HMAC — parses subscription lifecycle events, is idempotent against
  Stripe retries, and syncs subscription state into the `subscriptions` table
  (`FR-PAYWALL-03`, `FR-BILLING-01/02`).
- `cancel` calls the Stripe API to cancel at period end; the state change lands
  via the webhook path (`FR-BILLING-02`).
- Config: `STRIPE_SECRET_KEY` (server-only, never in the client bundle),
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (client-safe), `STRIPE_WEBHOOK_SECRET`;
  read via `shared/config` accessors that throw when the provider is `stripe`
  but a key is missing. Placeholder values in `.env.example`.
- The webhook route must read the raw request body (Stripe signature is computed
  over raw bytes) — the handler reads `await request.text()` before parsing.

## Capabilities

### New Capabilities

- `payments`: a Stripe (sandbox) adapter behind the swappable provider port —
  checkout session creation, signature-verified idempotent webhook sync, and
  cancellation — with server-only secret handling.

### Modified Capabilities

_None._ (The emulator's behavior is unchanged; Stripe is an additional adapter.)

## Impact

- Deps: adds `stripe` (server-only; excluded from the client bundle).
- Code: `src/shared/config/env.ts` (`PaymentsProviderName`, Stripe key
  accessors), `src/shared/lib/payments/{stripe.ts,factory.ts,index.ts}`,
  `src/app/api/payments/{checkout,webhook,subscription/cancel}/route.ts`.
- Specs: adds the `payments` capability. Depends on `add-payments-emulator`
  (port, subscriptions store, paywall/billing UI).
- Security: OWASP — webhook signature verification + idempotency (double-charge /
  forgery); secret key never client-side (NFR-SEC-02); no card data touches our
  servers (Stripe-hosted checkout).
- Out of scope: merchant-of-record / VAT handling (deferred), live-mode keys,
  invoice-history UI beyond what `add-payments-emulator` already specs.
