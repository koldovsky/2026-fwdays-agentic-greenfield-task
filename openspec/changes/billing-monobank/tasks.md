## 1. Setup & Environment

- [ ] 1.1 Add required Monobank acquiring env variables (`MONOBANK_TOKEN` and `MONOBANK_WEBHOOK_URL`) to `.env.example`.
- [ ] 1.2 Configure and verify that database models for `subscriptions` are imported correctly.

## 2. Monobank Acquiring API Client

- [ ] 2.1 Implement HTTP client wrapper for Monobank Acquiring endpoints (`invoice/create`, `wallet/payment`, and `wallet/card` deletion).
- [ ] 2.2 Implement webhook signature verification using native Node.js `crypto` to parse and verify the `X-Sign` header against raw request body.

## 3. Next.js Billing API Routes

- [ ] 3.1 Create Route Handler `POST /api/billing/invoice` to process the checkout of tariff plans ($10.99/mo and $120/yr dynamic UAH value) and initialize invoice with `saveCardData: { saveCard: true }`.
- [ ] 3.2 Create Webhook Route Handler `POST /api/billing/webhook` to handle payment status updates (updating database with `cardToken` and `walletId` on success, handling idempotency).
- [ ] 3.3 Create API endpoint `POST /api/billing/pause` to process subscription pause request.
- [ ] 3.4 Create API endpoint `POST /api/billing/cancel` to handle user cancellations.

## 4. Background Billing Scheduler (Cron)

- [ ] 4.1 Implement scheduler handler (cron job) to find active subscriptions reaching `current_period_end` and execute `POST /api/merchant/wallet/payment` with `initiationKind: "merchant"`.
- [ ] 4.2 Integrate retry queue logic in the cron process to retry failed payments up to 2 times within 48 hours before setting subscription to `suspended`.

## 5. Telegram Billing Alerts

- [ ] 5.1 Implement admin alerts for key lifecycle events (New subscription, payment received, pause, cancellation).
- [ ] 5.2 Implement user alerts inside the Telegram bot for welcome messages, failed payment retries, and subscription suspension.

## 6. Billing Dashboard UI

- [ ] 6.1 Design pricing table/selector for Monthly ($10.99/mo) and Yearly ($120/yr) options.
- [ ] 6.2 Create billing manager page in dashboard showing status (Active, Paused, Suspended, Cancelled) and card details (masked card, expiry).
- [ ] 6.3 Bind action buttons (Pause, Cancel, Resume, Checkout) to Next.js API routes with confirmation modals.
