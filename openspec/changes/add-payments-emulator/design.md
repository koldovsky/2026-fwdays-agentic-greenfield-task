# Design — add-payments-emulator

## Context

The PRD assumes a merchant-of-record (Paddle / Lemon Squeezy) with subscription
state synced via webhooks into a `subscriptions` table (`TC-STACK-06`). That
decision is deferred and a real MoR is overkill for dev/demo. We need the paywall,
checkout, and billing flows working now, with a clean seam to swap the real MoR in
later.

## Goals

- Full upgrade + billing flows working locally with no external provider.
- One provider interface; emulator and real MoR are interchangeable adapters.
- Subscription state is always driven by webhooks (even emulated), so the real
  provider path is exercised, not bypassed.

## Decisions

- **Provider port** in `shared/lib/payments`:
  `createCheckout(plan, user) → checkoutUrl`, `handleWebhook(event) → void`,
  `getSubscription(user)`, `cancel(user)`. Both adapters implement it.
- **Emulator adapter:** renders a local `/checkout` screen with explicit
  "Succeed" / "Fail" actions instead of a real card form. On action it POSTs a
  signed event to the app's own `/api/payments/webhook`, mirroring how the real
  MoR would call back — so subscription sync is identical in both modes.
- **Webhook is the source of truth:** the checkout screen never writes
  `subscriptions` directly; only the webhook handler does (FR-PAYWALL-03,
  FR-BILLING-02). Keeps emulator and MoR behavior identical.
- **Feature flag** `PAYMENTS_PROVIDER = emulator | <mor>` in `shared/config`
  selects the adapter; default `emulator` in dev, never in production.
- **Failure path:** emulated failure returns Free status with a retry CTA and no
  partial access (FR-BILLING-03); failed attempts don't grant entitlements.
- **Return-to-screen:** checkout carries an opaque `returnTo` so a successful
  upgrade drops the user back exactly where they were (FR-PAYWALL-03).

## Non-goals

- Real card processing, tax, refunds, dunning — belong to the real MoR adapter.
- Invoice PDF generation — emulator shows a synthetic invoice list only.

## Risks

- Signed emulated webhooks must not be accepted in production; guard by env +
  flag. Real MoR swap must reuse the same signature-verification seam.
