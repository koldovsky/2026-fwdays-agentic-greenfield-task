# Rework subscription plans

## Why

The current plan model ships two paid tiers: Pro ($12/mo, unlimited tailorings)
and Job-hunt Pass ($19 one-time, 30 days). Three gaps make the lineup
commercially weak and technically incorrect:

1. **Missing a flagship tier.** There is no plan above Pro. Candidates who want
   daily high-volume tailoring, interview prep, or a private community have no
   upgrade path, so ceiling revenue is capped at $12. Adds Ultra ($30/mo) with
   the flagship Claude model and interview-prep features (FR-BILLING-01,
   FR-BILLING-02, FR-SALES-03).
2. **Job-hunt Pass period is wrong.** The current emulator grants every plan 30
   days (`PERIOD_DAYS = 30`). The product decision is 14 days for the Pass, not
   30 — the pass is a focused sprint, not a month (FR-BILLING-01,
   FR-PAYWALL-02). The DB migration CHECK and all downstream constants must
   change together.
3. **Pricing is wrong in the existing copy.** The landing and billing portal show
   Job-hunt Pass at $19 but the decided price is $20. `PLAN_AMOUNT_USD` and the
   i18n `planPrice` strings must be corrected (FR-SALES-03, FR-BILLING-01).
4. **Benefit copy is a single string, not bullets.** `upgrade.planFeature` is
   `Record<plan, string>` today, which renders as one sentence. The paywall plan
   chooser, billing portal current-plan card, and landing pricing table all need
   a structured feature list (`readonly string[]`) so benefits can be scanned
   quickly (FR-SALES-03, FR-BILLING-01).
5. **Plan keys are missing across i18n maps.** Every plan-keyed Record in
   `shared/lib/i18n` (`checkout.planName`, `checkout.planPrice`,
   `upgrade.planFeature`, `upgrade.chooseAction`, `billing.planName`,
   `landing.pricing`) and the type definitions must add `ultra` (NFR-I18N-01).

## What Changes

- **New plan `ultra`**: added to `Plan` (entities), `PaymentsPlan` (shared
  payments), `SubscriptionPlan` (repo), and `PAID_PLANS` (entity lib). A new DB
  migration extends the `plan CHECK` constraint.
- **Per-plan period map**: the emulator's `PERIOD_DAYS` constant becomes a
  `PERIOD_DAYS_BY_PLAN` map; `job_hunt_pass` grants 14 days, `pro` and `ultra`
  grant 30 days (monthly cycle).
- **Corrected pricing**: Job-hunt Pass price corrected to $20 in
  `PLAN_AMOUNT_USD` and all i18n copy. Pro stays $12. Ultra is $30/mo.
- **Benefit bullets**: `upgrade.planFeature` type changes from
  `Record<plan, string>` to `Record<plan, readonly string[]>`. All three paid
  plans get authored benefit bullets in ua+en. `billing.planBenefits` (new key)
  carries the same content for the billing portal current-plan display.
- **Landing pricing table**: the `landing.pricing` dictionary adds an `ultra`
  card; `pricingSection()` in `content.ts` assembles four plans (Free + Pro +
  Ultra + Job-hunt Pass). The `Pricing.tsx` component renders up to four cards
  with Ultra featured. Free is rendered as a lightweight row below the three
  paid cards.
- **UpgradePlans** and **BillingPortal**: add `ultra` to the plan list; replace
  the single feature sentence with a `<ul>` of benefit bullets.

## Capabilities

### Added Capabilities

- `billing`: Ultra tier with 30-day renewal, per-plan period map in the
  emulator, benefit bullets on plan chooser and current-plan display.

### Modified Capabilities

- `billing`: Pro and Job-hunt Pass benefit copy becomes structured bullet lists;
  Job-hunt Pass period corrected to 14 days; Job-hunt Pass price corrected to
  $20; `ultra` added to every plan union, type map, and i18n Record.
- `marketing-landing`: pricing table grows from three plans to four, Ultra is
  featured, Free moves to a lightweight row; all benefit content is sourced from
  the shared i18n `landing.pricing` dictionary.

## Impact

- `src/shared/lib/db/migrations/` — new SQL file (0005) to ADD 'ultra' to the
  `subscriptions.plan` CHECK constraint.
- `src/entities/subscription/model/types.ts` — `Plan` union adds `"ultra"`.
- `src/shared/lib/payments/types.ts` — `PaymentsPlan` adds `"ultra"`;
  `PAYMENTS_PLANS` updated.
- `src/shared/lib/db/subscription-repo.ts` — `SubscriptionPlan` adds `"ultra"`.
- `src/entities/subscription/lib/subscription.ts` — `PAID_PLANS` adds `"ultra"`.
- `src/shared/lib/payments/emulator.ts` — `PERIOD_DAYS` constant replaced by
  `PERIOD_DAYS_BY_PLAN` map.
- `src/widgets/billing-portal/lib/invoices.ts` — `PLAN_AMOUNT_USD` adds
  `ultra: 30`, corrects `job_hunt_pass: 20`; `SyntheticInvoice.plan` adds
  `"ultra"`; period lookup moves to the per-plan map.
- `src/shared/lib/i18n/types.ts` — `upgrade.planFeature` and new
  `billing.planBenefits` become `Record<plan, readonly string[]>`; all
  plan-keyed Records gain `"ultra"`.
- `src/shared/lib/i18n/en.ts` + `ua.ts` — authored benefit bullets and Ultra
  copy in both languages; corrected prices.
- `src/views/landing/lib/content.ts` — `pricingSection()` adds Ultra card; Free
  card gains `freeRow: true` discriminator.
- `src/views/landing/ui/Pricing.tsx` — four-card layout, Ultra featured.
- `src/features/upgrade/ui/UpgradePlans.tsx` — three-plan grid, bullets `<ul>`.
- `src/widgets/billing-portal/ui/BillingPortal.tsx` — current-plan benefit list
  for paid plans; `ultra` in the monthly-renewal branch.
- **NFR-PERF-04:** no new fonts or global CSS; no LCP regression expected.
- **BC-HONESTY-01/02:** benefit copy is marketing, not grounding; it carries no
  claims about CV evidence. The honesty pipeline is untouched.

## Open questions

1. **Landing layout for four plans.** Default adopted here: three paid cards
   (Pro / Ultra / Job-hunt Pass) in a `md:grid-cols-3` grid with Ultra
   featured, plus Free as a lightweight descriptive row above the paid cards.
   Revisit if the design team prefers a four-column grid.
2. **UpgradePlans plan order.** Default: Pro / Ultra / Job-hunt Pass (ascending
   price, no surprises). Ultra gets the `primary` variant button (was Pro).
   Revisit if A/B data favors a different order.
3. **Interview prep and private community** are listed as Ultra benefits in the
   marketing copy but are not yet implemented features. They are surfaced as
   benefit bullets only, consistent with the "future" label in the user draft.
   Remove or revise when those features ship.
