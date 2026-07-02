## 1. Provider port + emulator

- [ ] 1.1 Define payments port in `shared/lib/payments` (createCheckout/handleWebhook/getSubscription/cancel) + `PAYMENTS_PROVIDER` flag in `shared/config`
- [ ] 1.2 Emulator adapter: local `/checkout` screen with Succeed/Fail actions that POST signed events to `/api/payments/webhook`
- [ ] 1.3 Webhook handler updates `subscriptions` (only writer); signature verification seam reused by real MoR later

## 2. Paywall + checkout

- [ ] 2.1 `widgets/paywall` + `features/upgrade`: intercept export and second tailoring, offer Pro / Job-hunt Pass (FR-PAYWALL-01/02)
- [ ] 2.2 Enforce free-tier limits via `usage_counters` (NFR-COST-02)
- [ ] 2.3 `returnTo` round-trip: successful upgrade returns to exact prior screen unlocked (FR-PAYWALL-03)

## 3. Billing portal

- [ ] 3.1 `widgets/billing-portal`: current plan, next renewal, invoice history, cancel (FR-BILLING-01)
- [ ] 3.2 Cancel → downgrade at period end; export gated, tailorings still readable (FR-BILLING-02)
- [ ] 3.3 Failure path → Free + retry CTA, no partial access (FR-BILLING-03)

## 4. Verify & review

- [ ] 4.1 agent-verify: end-to-end emulated upgrade + cancel + failure; evidence for FR-PAYWALL-01/02/03, FR-BILLING-01/02/03
- [ ] 4.2 Assert emulator disabled in production config and webhook is the sole subscription writer
- [ ] 4.3 Independent checker-review vs PRD + FSD import rules
