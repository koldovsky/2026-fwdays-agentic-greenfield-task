## 1. Config + dependency

- [ ] 1.1 Add the `stripe` Node SDK to dependencies (server-only; confirm it is excluded from the client bundle via `serverExternalPackages` / not imported from any client component)
- [ ] 1.2 Extend `PaymentsProviderName` in `src/shared/config/env.ts` to `"emulator" | "stripe"`; keep `emulator` the default and the production guard intact
- [ ] 1.3 Add `shared/config` accessors: `getStripeSecretKey()`, `getStripePublishableKey()`, `getStripeWebhookSecret()` — throw a clear error when `PAYMENTS_PROVIDER=stripe` but the value is unset (mirror the existing `getPaymentsWebhookSecret` pattern); secret key server-only
- [ ] 1.4 Add the Stripe placeholders to `.env.example` and the `docs/dev-setup.md` table (done in the roadmap pass — verify still accurate)

## 2. Stripe adapter (behind the port)

- [ ] 2.1 Add `src/shared/lib/payments/stripe.ts` implementing `PaymentsProvider` (`createCheckout`, `handleWebhook`, `getSubscription`, `cancel`) over an injected `SubscriptionsStore` + a Stripe client — FR-PAYWALL-02, TC-STACK-06
- [ ] 2.2 `createCheckout`: create a Stripe Checkout Session (subscription mode) for the chosen plan, return its hosted URL; validate `returnTo` against an allowlisted origin (no open redirect) — FR-PAYWALL-02
- [ ] 2.3 `handleWebhook`: map Stripe subscription lifecycle events to the port's `PaymentsEvent` shape and sync the `subscriptions` table; idempotent against Stripe retries (dedupe by event id) — FR-PAYWALL-03, FR-BILLING-01
- [ ] 2.4 `cancel`: cancel the Stripe subscription at period end; state change arrives via the webhook path — FR-BILLING-02
- [ ] 2.5 Run the shared provider contract test (`describePaymentsProviderContract("stripe", …)`) against the adapter with a mocked Stripe client — parity with the emulator
- [ ] 2.6 Branch `resolvePaymentsProvider` in `factory.ts` on `PAYMENTS_PROVIDER=stripe`

## 3. Webhook route (signature-verified)

- [ ] 3.1 In `src/app/api/payments/webhook/route.ts`, read the RAW body (`await request.text()`) and verify with `stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET)` — reject with 400 on a bad/absent signature; never a custom HMAC — OWASP webhook forgery
- [ ] 3.2 Node runtime; a failed apply logs server-side and returns a calm coded error, never a raw 500 (NFR-OBS-01); a duplicate event id is a no-op 200 (idempotency)

## 4. Checkout + upgrade flow

- [ ] 4.1 Confirm `/api/payments/checkout` + `/checkout` return + `FR-PAYWALL-03` (session upgrades immediately, user returns to the screen they left) work with the Stripe adapter
- [ ] 4.2 Confirm the billing portal (`FR-BILLING-01`) reflects Stripe-sourced plan / renewal / cancel state

## 5. Tests + security

- [ ] 5.1 Unit: adapter contract (mocked Stripe), webhook signature accept/reject, idempotent replay, secret-missing accessor throw
- [ ] 5.2 Assert the secret key is never referenced from a client component / never in the client bundle (NFR-SEC-02)
- [ ] 5.3 Live sandbox smoke (needs test keys + `stripe listen`): checkout → paid webhook → subscription active → cancel → downgrade at period end

## 6. Verify

- [ ] 6.1 `yarn lint` + `yarn build` + `yarn test` clean; run agent-verify + checker-review; update `docs/current-state.md`; then `openspec validate add-stripe-payments` and archive
