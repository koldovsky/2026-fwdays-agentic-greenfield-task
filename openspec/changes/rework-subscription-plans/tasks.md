# Tasks — rework-subscription-plans

## 1. DB migration — extend plan CHECK constraint

- [ ] 1.1 Create `src/shared/lib/db/migrations/0005_ultra_plan.sql`. Add `'ultra'`
  to the `subscriptions.plan` CHECK constraint. Use `ALTER TABLE ... DROP CONSTRAINT
  ... ADD CONSTRAINT` (or the equivalent safe migration for PGlite). Mirror the
  pattern of `0003_checklist_info_status.sql`. Add a comment citing FR-BILLING-01.
- [ ] 1.2 Register the new migration file in the migration runner so it executes in
  order after 0004. Verify via `yarn db:migrate` (or equivalent) against the local
  PGlite instance without error.

## 2. Plan type propagation — models and guards

- [ ] 2.1 `src/entities/subscription/model/types.ts`: add `"ultra"` to the `Plan`
  union. Update the JSDoc comment. Cite FR-BILLING-01.
- [ ] 2.2 `src/shared/lib/payments/types.ts`: add `"ultra"` to `PaymentsPlan` and
  `PAYMENTS_PLANS`. `isPaymentsPlan` guard picks it up automatically. Cite
  FR-PAYWALL-02.
- [ ] 2.3 `src/shared/lib/db/subscription-repo.ts`: add `"ultra"` to
  `SubscriptionPlan`. No behavior change needed — the repo is generic over the
  plan string.
- [ ] 2.4 `src/entities/subscription/lib/subscription.ts`: add `"ultra"` to
  `PAID_PLANS`. `hasPaidAccess` and `isSubscriptionActive` pick it up without
  further change. Add a test for `hasPaidAccess` with an active `ultra`
  subscription (mirrors the existing `pro` test).

## 3. Per-plan period map in the emulator

- [ ] 3.1 `src/shared/lib/payments/emulator.ts`: replace the single `PERIOD_DAYS = 30`
  constant with a `PERIOD_DAYS_BY_PLAN: Record<PaymentsPlan, number>` map:
  `{ pro: 30, ultra: 30, job_hunt_pass: 14 }`. Update the `checkout.completed`
  handler to look up the period from the map by `event.plan`. Update the JSDoc
  comment to reflect per-plan periods. Cite FR-BILLING-01, FR-PAYWALL-02.
- [ ] 3.2 Update or add emulator unit tests: assert that a `job_hunt_pass`
  `checkout.completed` event produces `currentPeriodEnd = occurredAt + 14 days`,
  and that `pro` / `ultra` still produce 30 days. Use the injectable `now` clock
  for deterministic assertions.
- [ ] 3.3 `src/widgets/billing-portal/lib/invoices.ts`: replace the local
  `PERIOD_DAYS = 30` constant with the same per-plan map (or import a shared
  constant if one is extracted). Add `ultra: 30` to `PLAN_AMOUNT_USD`, correct
  `job_hunt_pass` from `19` to `20`. Extend `SyntheticInvoice.plan` to include
  `"ultra"`. Update `deriveInvoices` to use the per-plan period. Add tests for
  Ultra invoice (`amountUsd: 30`) and corrected Job-hunt Pass invoice (`amountUsd:
  20`). Cite FR-BILLING-01.

## 4. i18n types and content

- [ ] 4.1 `src/shared/lib/i18n/types.ts`:
  - Change `upgrade.planFeature` from `Record<"pro" | "job_hunt_pass", string>` to
    `Record<"pro" | "ultra" | "job_hunt_pass", readonly string[]>`.
  - Add `billing.planBenefits: Record<"pro" | "ultra" | "job_hunt_pass", readonly string[]>`
    (parallel key for the billing portal current-plan benefit display).
  - Extend `checkout.planName`, `checkout.planPrice`, `upgrade.chooseAction`,
    `billing.planName` to include `"ultra"`.
  - Extend `landing.pricing` with an `ultra` key matching the shape of `pro`
    (name, cadence, features, cta, badge).
  - Cite NFR-I18N-01.
- [ ] 4.2 `src/shared/lib/i18n/en.ts`: fill all new keys. Use the approved benefit
  bullets (see proposal proposedCopy). Correct `checkout.planPrice.job_hunt_pass`
  to `"$20 one-time, 14 days"`. Correct `landing.pricing.pass` price display.
  No emoji, no exclamation points, no em-dashes (BC-BRAND-01).
- [ ] 4.3 `src/shared/lib/i18n/ua.ts`: mirror 4.2 exactly in Ukrainian. All keys,
  benefit-array lengths, and structural shape must be identical to `en`. Cite
  NFR-I18N-01.
- [ ] 4.4 Extend existing i18n parity tests (or add new ones) to cover:
  - `upgrade.planFeature` — keys and array lengths match between `ua` and `en`
    for all three paid plans.
  - `billing.planBenefits` — same parity check.
  - `checkout.planName` / `checkout.planPrice` contain `"ultra"`.
  All tests must be deterministic pure-function assertions (TC-PURE-01).

## 5. Landing pricing table

- [ ] 5.1 `src/views/landing/lib/content.ts`: update `pricingSection()` to assemble
  four entries (Free as `{ ..., freeRow: true }`, Pro, Ultra, Job-hunt Pass).
  Ultra is `featured: true` (was Pro). Pro and Job-hunt Pass are `featured: false`.
  Add `ultra` price `"$30"`. Keep the existing `Plan` interface but add an optional
  `freeRow?: boolean` discriminator. Cite FR-SALES-03.
- [ ] 5.2 `src/views/landing/ui/Pricing.tsx`: rework the layout to:
  - Render the Free row above the paid grid as a compact descriptive strip (plan
    name, "free" label, minimal feature summary, CTA link) — NOT a full card.
  - Render the three paid plans in `md:grid-cols-3` with Ultra featured (inverted
    card, primary CTA). Brand rules apply: no new hues, no emoji, no icon libraries
    (BC-BRAND-01, NFR-A11Y-01). Each feature item is a `<li>` in a `<ul>`.
  - Update the baseline `marketing-landing` spec's pricing-table requirement in
    `openspec/specs/marketing-landing/spec.md` to reflect four plans (Free +
    three paid) — this is a follow-on archive concern but note it in the PR.
- [ ] 5.3 Add or update landing snapshot / rendering tests to assert all four plan
  names appear in the pricing section.

## 6. Upgrade chooser and billing portal

- [ ] 6.1 `src/features/upgrade/ui/UpgradePlans.tsx`: update `PLANS` to
  `["pro", "ultra", "job_hunt_pass"]`. Replace the single `<p>` feature sentence
  with a `<ul>` rendering each item in `copy.upgrade.planFeature[plan]`. Set the
  `primary` button variant on `ultra` (currently `pro`). Update tests. Cite
  FR-PAYWALL-02, FR-SALES-03.
- [ ] 6.2 `src/widgets/billing-portal/ui/BillingPortal.tsx`:
  - Add `"ultra"` to the monthly-renewal date-label branch (line 72 area): `ultra`
    and `pro` both show `billing.renewsOnLabel`; `job_hunt_pass` shows
    `billing.expiresOnLabel`.
  - When the current plan is a paid plan, render `billing.planBenefits[plan]` as
    a `<ul>` of benefit items under the plan name. This surfaces the benefit list
    on the current-plan card, not only in the chooser.
  - Update or add tests for Ultra plan display and benefit list rendering.
  - Cite FR-BILLING-01, FR-BILLING-02.

## 7. Verify

- [ ] 7.1 `yarn lint` — zero new errors. All new plan-keyed Records must satisfy
  TypeScript exhaustiveness (no missing keys). Record the output.
- [ ] 7.2 `yarn build` — zero type errors, zero build errors. Record the output.
- [ ] 7.3 `yarn test` — all existing tests pass; all new tests in tasks 2.4, 3.2,
  3.3, 4.4, 5.3, 6.1, 6.2 are green. Record file count and test count.
- [ ] 7.4 Manual smoke: start the dev server and visit `/account/billing` with a
  free session — confirm the upgrade chooser shows three paid plans with bullet
  lists; confirm plan names and prices are correct in both UA and EN locales.

## 8. Independent review (maker is not checker)

- [ ] 8.1 Run the `checker` subagent (or `checker-review` skill) against the full
  diff of this change. The checker reads the proposal, both delta specs, and the
  diff; it does NOT write code. It must confirm:
  - Every plan union change (types.ts, payments/types.ts, subscription-repo.ts,
    entities lib) is consistent — no stranded `"pro" | "job_hunt_pass"` bimap.
  - Migration 0005 is syntactically valid and safe (no data loss path for existing
    rows; the CHECK extension is additive).
  - Job-hunt Pass period is 14 days in the emulator AND in invoices.ts (both
    constants changed together).
  - Benefit bullets contain no emoji, exclamation points, or em-dashes (BC-BRAND-01).
  - ua and en benefit arrays have identical lengths per plan (NFR-I18N-01).
  - No grounding or honesty claim appears in the benefit copy (BC-HONESTY-01/02).
  - The landing pricing section audit scenario (no emoji/exclamation/off-palette)
    passes against the new Pricing.tsx.
- [ ] 8.2 Address all BLOCKING findings before merging. Record checker verdict and
  any findings in the PR description.
