## 1. Setup & Environment

- [x] 1.1 Add required Monobank acquiring env variables (`MONOBANK_TOKEN` and `MONOBANK_WEBHOOK_URL`) to `.env.example`.
- [x] 1.2 Configure and verify that database models for `subscriptions` are imported correctly.

## 2. Monobank Acquiring API Client

- [x] 2.1 Implement HTTP client wrapper for Monobank Acquiring endpoints (`invoice/create`, `wallet/payment`, and `wallet/card` deletion).
- [x] 2.2 Implement webhook signature verification using native Node.js `crypto` to parse and verify the `X-Sign` header against raw request body (using cached public key, retrying once on failure, and falling back to cached key if API is down).

## 3. Next.js Billing API Routes

- [x] 3.1 Create Route Handler `POST /api/billing/invoice` to process the checkout of tariff plans ($10.99/mo and $120/yr dynamic UAH value, using 1-hour cached exchange rate with fallback to DB / 41.5 UAH/USD) and initialize invoice with `saveCardData: { saveCard: true }`.
- [x] 3.2 Create Webhook Route Handler `POST /api/billing/webhook` to handle payment status updates (updating database with `cardToken` and `walletId` on success, handling idempotency by checking active invoice status first).
- [x] 3.3 Create API endpoint `POST /api/billing/pause` to process subscription pause request.
- [x] 3.4 Create API endpoint `POST /api/billing/cancel` to handle user cancellations.
- [x] 3.5 Create API endpoint `POST /api/billing/resume` to handle subscription resumption (enabling `autoRenew: true` if active/pending, triggering wallet payment with `amount` and `ccy` if paused/suspended and saving the returned `invoiceId` as `lastInvoiceId`, or creating a new invoice if cancelled and expired).

## 4. Background Billing Scheduler (Cron)

- [x] 4.1 Implement scheduler handler (cron job) to find active subscriptions reaching `current_period_end` and execute `POST /api/merchant/wallet/payment` with `initiationKind: "merchant"` (passing `cardToken`, calculated `amount`, `ccy`: 980 and saving the returned `invoiceId` as `lastInvoiceId` in the database).
- [x] 4.2 Integrate retry queue logic in the cron process to retry failed payments up to 2 times within 48 hours before setting subscription to `suspended`.

## 5. Telegram Billing Alerts

- [x] 5.1 Implement admin alerts for key lifecycle events (New subscription, payment received, pause, cancellation, resumption) using correct data sources (Monobank webhook name/phone/time, DB email/website/TG nickname) and ensuring a calm tone without exclamation marks.
- [x] 5.2 Implement user alerts inside the Telegram bot for welcome messages, failed payment retries (with dashboard link to update card), subscription pause, and subscription suspension/cancellation (with pay/restore link), ensuring a calm tone without exclamation marks.

## 6. Billing Dashboard UI

- [x] 6.1 Design pricing table/selector for Monthly ($10.99/mo) and Yearly ($120/yr) options.
- [x] 6.2 Create billing manager page in dashboard showing status (Active, Paused, Suspended, Cancelled) and card details (masked card, expiry).
- [x] 6.3 Bind action buttons (Pause, Cancel, Resume, Checkout) to Next.js API routes with confirmation modals (cancellation modal warning about conversions stop and loss of ads efficiency).
