# billing (delta)

## ADDED Requirements

### Requirement: Ultra tier

The system SHALL support an `ultra` plan as a paid subscription tier at $30/mo
with a 30-day renewable period, granting all Pro entitlements plus the flagship
AI model, higher daily tailoring limits, interview-prep features, and access to
a private community. `ultra` SHALL be treated as a paid plan in every
entitlement check that today covers `pro` and `job_hunt_pass`
(`PAID_PLANS`, `hasPaidAccess`, `isSubscriptionActive`). Implements FR-BILLING-01,
FR-BILLING-02, FR-PAYWALL-02.

#### Scenario: Ultra grants paid access

- **WHEN** a user holds an active `ultra` subscription within its period end
- **THEN** `hasPaidAccess` returns `true` and the user may export, view history,
  and access all Pro features

#### Scenario: Ultra cancellation follows period-end semantics

- **WHEN** an `ultra` subscription is canceled
- **THEN** the subscription status becomes `canceled`, access continues until
  `currentPeriodEnd`, and the user is downgraded to Free at period end
  (FR-BILLING-02)

#### Scenario: Ultra plan persisted and retrieved

- **WHEN** the payments webhook fires `checkout.completed` for plan `ultra`
- **THEN** the subscription row stores `plan = 'ultra'` and
  `current_period_end = now + 30 days`
- **AND** `createSubscriptionRepo.get` returns a record with `plan: "ultra"`

### Requirement: Per-plan period map in the emulator

The payments emulator SHALL grant access periods per plan rather than a single
constant: Pro and Ultra each receive 30 days per payment cycle; Job-hunt Pass
receives 14 days per purchase. The emulator MUST be the only writer that
determines period lengths. Implements FR-BILLING-01, FR-PAYWALL-02.

#### Scenario: Job-hunt Pass grants 14 days

- **WHEN** a `checkout.completed` event arrives for `job_hunt_pass`
- **THEN** `currentPeriodEnd` is set to `occurredAt + 14 days`

#### Scenario: Pro and Ultra each grant 30 days

- **WHEN** a `checkout.completed` event arrives for `pro` or `ultra`
- **THEN** `currentPeriodEnd` is set to `occurredAt + 30 days`

#### Scenario: A failed payment does not create partial access

- **WHEN** a `checkout.failed` event arrives for any plan
- **THEN** no subscription row is written or mutated, leaving the user on Free
  (FR-BILLING-03)

## MODIFIED Requirements

### Requirement: Plan set extends to three paid tiers

The plan union across all layers SHALL be `"free" | "pro" | "ultra" |
"job_hunt_pass"`. The `ultra` value SHALL appear in: the `Plan` type
(`entities/subscription`), the `PaymentsPlan` type and `PAYMENTS_PLANS` guard
(`shared/lib/payments`), the `SubscriptionPlan` type (`shared/lib/db`), and the
`plan CHECK` constraint in the subscriptions table (added via migration
0005). Implements FR-BILLING-01, FR-BILLING-02, FR-BILLING-03.

#### Scenario: Ultra accepted by the DB constraint

- **WHEN** the subscription repo upserts a record with `plan = 'ultra'`
- **THEN** the database accepts the row (the CHECK constraint includes 'ultra')

#### Scenario: Unknown plan rejected at the type boundary

- **WHEN** `isPaymentsPlan` is called with a value not in the plan set
- **THEN** it returns `false` and no subscription mutation occurs

### Requirement: Structured benefit copy for paid plans

Each paid plan (`pro`, `ultra`, `job_hunt_pass`) SHALL expose its benefits as a
`readonly string[]` in `upgrade.planFeature` (used in the paywall plan chooser
and billing portal) and in `landing.pricing.<plan>.features` (used in the
pricing table). A single-line description is insufficient for three differentiated
tiers. Both ua and en dictionaries SHALL carry identical key structure with parity
of benefit count per plan. Implements FR-SALES-03, FR-BILLING-01, NFR-I18N-01.

#### Scenario: Benefit list renders in upgrade chooser

- **WHEN** `UpgradePlans` renders for a plan
- **THEN** each item in `upgrade.planFeature[plan]` appears as a list item
  inside a `<ul>` element with no single-sentence fallback

#### Scenario: i18n parity enforced in tests

- **WHEN** the i18n parity test suite runs
- **THEN** `upgrade.planFeature` keys and array lengths match between `ua` and
  `en` for every plan

### Requirement: Job-hunt Pass price corrected to $20

The Job-hunt Pass price SHALL be $20 everywhere it appears: `PLAN_AMOUNT_USD`
in `billing-portal/lib/invoices.ts`, the `checkout.planPrice` i18n string, and
the `landing.pricing.pass.cadence` or equivalent price display. Implements
FR-SALES-03, FR-BILLING-01.

#### Scenario: Invoice amount for Job-hunt Pass

- **WHEN** `deriveInvoices` is called for a `job_hunt_pass` subscription
- **THEN** the returned invoice has `amountUsd: 20`

#### Scenario: Invoice amount for Ultra

- **WHEN** `deriveInvoices` is called for an `ultra` subscription
- **THEN** the returned invoice has `amountUsd: 30`

#### Scenario: Billing portal current-plan displays price

- **WHEN** the billing portal renders for a paid plan (pro, ultra, job_hunt_pass)
- **THEN** `checkout.planPrice[plan]` is shown, reflecting the corrected price
