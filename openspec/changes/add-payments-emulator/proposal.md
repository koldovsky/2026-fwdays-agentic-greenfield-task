## Why

Vouch needs a working paywall, checkout, and billing portal (FR-PAYWALL-01/02/03,
FR-BILLING-01/02/03), but the real merchant-of-record (`TC-STACK-06`, Paddle /
Lemon Squeezy) is undecided and unnecessary for development and demos. This change
adds a self-contained **payments emulator** that implements the same
provider-facing contract (checkout session + webhooks) so the full upgrade and
billing flows work end-to-end and the real MoR can be swapped in later behind the
same interface.

## What Changes

- Add a `payments` capability with a provider port (`createCheckout`,
  `handleWebhook`, `getSubscription`, `cancel`) and a built-in **emulator adapter**
  that fakes the MoR: a local checkout screen, deterministic success/failure
  toggles, and self-posted webhooks that sync `subscriptions` state.
- Add the paywall that intercepts export and any second tailoring (FR-PAYWALL-01),
  offering Pro and Job-hunt Pass (FR-PAYWALL-02); on emulated success the session
  upgrades immediately and returns to the exact screen left (FR-PAYWALL-03).
- Add a billing portal: current plan, next renewal date, invoice history, cancel
  (FR-BILLING-01); cancel downgrades at period end (FR-BILLING-02); emulated
  payment failure returns to Free with a retry CTA and no partial-access state
  (FR-BILLING-03).
- Emulator is dev/demo only, behind a feature flag; the port makes the real MoR a
  drop-in replacement synced via webhooks (`TC-STACK-06`).
- Free-tier limits enforced via usage counters (NFR-COST-02).

## Capabilities

### New Capabilities
- `payments`: provider port + emulator adapter, paywall, checkout, webhook sync,
  and billing portal. Serves FR-PAYWALL-01/02/03, FR-BILLING-01/02/03, TC-STACK-06.

### Modified Capabilities
<!-- None. Depends on subscriptions/usage_counters tables from add-persistence. -->

## Impact

- New: `shared/lib/payments` (port + emulator adapter + webhook verifier),
  `features/upgrade`, `widgets/paywall` + `widgets/billing-portal`,
  route handlers `src/app/api/payments/**` (checkout, webhook).
- Depends on: `add-persistence` (subscriptions, usage_counters), `add-auth`
  (current user). Feature flag in `shared/config`.
- Serves: FR-PAYWALL-01/02/03, FR-BILLING-01/02/03, TC-STACK-06, FR-SALES-03,
  NFR-COST-02.
