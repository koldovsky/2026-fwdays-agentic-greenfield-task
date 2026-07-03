# Specification: Subscription and Monobank Acquiring Integration (`billing-monobank`)

## Glossary and Definitions
- **Monobank Acquiring API**: The back-to-back REST API provided by Monobank for payment processing.
- **Invoice**: A billing transaction created on Monobank with a unique ID and checkout URL.
- **Webhook**: An HTTP POST callback request sent by Monobank to notify the platform of transaction status updates.
- **Card Token (`cardToken`)**: A token representing a saved credit card, used for recurring payments.
- **Wallet ID (`walletId`)**: A container identifier on Monobank representing a collection of stored payment methods for a customer.
- **ECDSA Signature**: Elliptic Curve Digital Signature Algorithm signature used by Monobank webhooks for request verification.
- **Merchant-Initiated Payment**: A card transaction initiated by the platform without active user interaction, using a saved card token.

## Scope & Non-Goals
### Bounded Scope
- Integration with the Monobank Acquiring API for card tokenization (`saveCardData: { saveCard: true }`).
- Creating and storing billing profiles in the local `subscriptions` table.
- A Webhook Route Handler to accept and securely verify payment webhooks.
- A background cron task to run recurrent payments and handle retries.
- Frontend dashboard buttons for subscription creation, pausing, cancellation, and manual retry.
- Adhering to the Ukrainian locale with calm, practical notifications and messages (no exclamation marks).

### Non-Goals
- Support for other payment providers (e.g. LiqPay, Stripe).
- Submerchants or multi-currency checkout (UAH only).

## ADDED Requirements

### Requirement: Subscription Tariff Plans
The system SHALL support two subscription tariff plans: Monthly (valued at $10.99/month in UAH equivalent) and Yearly (valued at $120/year in UAH equivalent). The UAH amount SHALL be dynamically determined in UAH equivalent minor units (kopecks) when creating invoices.

#### Scenario: Tariff plans definition and pricing check
- **WHEN** a subscription registration or renewal is initiated for a selected tariff plan
- **THEN** the system SHALL calculate the UAH equivalent amount in minor units (kopecks).
- **AND** the system SHALL check the local cache for the exchange rate (TTL: 1 hour).
- **AND** if the cached rate is expired or missing, the system SHALL fetch the current exchange rate using Monobank's public API (`GET https://api.monobank.ua/bank/currency`), select the selling rate (`rateSell`) for USD (currencyCodeA: 840) to UAH (currencyCodeB: 980), and update the local cache.
- **AND** if the Monobank API is unreachable or returns an error (e.g. rate limit HTTP 429), the system SHALL fall back to a database-stored rate or use a hardcoded fallback exchange rate of 41.5 UAH/USD.
- **AND** the Monthly plan equivalent SHALL target approximately 10.99 USD in UAH kopecks.
- **AND** the Yearly plan equivalent SHALL target approximately 120.00 USD in UAH kopecks.

### Requirement: Invoice Creation for Card Tokenization
To initiate a subscription, the system SHALL request invoice creation via Monobank Acquiring API `POST /api/merchant/invoice/create` and specify `saveCardData: { saveCard: true }` in order to request card tokenization.

#### Scenario: Invoice creation with card tokenization requested
- **WHEN** a user initiates a subscription purchase for a tariff plan (`'monthly'` or `'yearly'`)
- **THEN** the system SHALL call the Monobank invoice creation API with `saveCardData.saveCard: true` and the calculated dynamic UAH amount.
- **AND** it SHALL retrieve the `invoiceId` and `pageUrl` from the response.
- **AND** it SHALL update the user's `subscriptions` record in the database with the `lastInvoiceId` set to `invoiceId`, `tariffPlan` set to the selected plan (`'monthly'` or `'yearly'`), `status` set to `'created'` (requiring extending the database schema's `subscription_status` enum to include `'created'`), and `currentPeriodEnd` set to the current time.
- **AND** it SHALL redirect the user to the provided `pageUrl` for payment.

### Requirement: Monobank Webhook Processing and ECDSA Signature Verification
The system SHALL expose a webhook endpoint to receive payment updates from Monobank. The system SHALL verify the authenticity of all webhooks by checking the `X-Sign` header against the raw, unparsed request body string (bytes) using Monobank's public key (fetched from `GET /api/merchant/pubkey` and cached).

#### Scenario: Successful payment webhook updates database subscription
- **WHEN** a webhook POST request with a valid ECDSA signature is received on `/api/billing/webhook` with status `success`
- **THEN** the system SHALL lookup the subscription by `invoiceId` matching `lastInvoiceId`.
- **AND** the system SHALL check if the subscription status is already `'active'` for this `invoiceId`. If yes, it SHALL immediately respond with HTTP status `200 OK` and skip further processing (idempotency check).
- **AND** the system SHALL extract `cardToken` and `walletId` from the webhook payload's `walletData` object.
- **AND** it SHALL persist the `cardToken` and `walletId` in the database `subscriptions` record.
- **AND** it SHALL update the subscription status to `'active'` and set `currentPeriodEnd` to the appropriate date (1 month or 1 year from the transaction completion).
- **AND** it SHALL send a Telegram alert to the administrator notifying them of the new active subscription and payment receipt (containing the client's name, website, phone, email, time, and Telegram nickname).
- **AND** it SHALL respond with HTTP status `200 OK` to Monobank.
- **AND** the system SHALL cache the public key fetched from `GET /api/merchant/pubkey`. If the key verification fails, the system SHALL retry fetching a fresh key from `GET /api/merchant/pubkey` once (to handle key rotation). If fetching a fresh key fails, it SHALL fall back to the cached key.

### Requirement: Automated Recurring Billing (Cron)
The system SHALL run a scheduled process (Cron) to initiate recurrent merchant billing for active subscriptions on their end date, via Monobank Acquiring API `POST /api/merchant/wallet/payment` with `initiationKind: "merchant"`.

#### Scenario: Cron triggers successful recurring payment
- **WHEN** the cron job runs and identifies a subscription with status `'active'`, `autoRenew` set to `true`, and `currentPeriodEnd` less than or equal to the current time
- **THEN** the system SHALL execute a recurrent payment request to Monobank Acquiring API `POST /api/merchant/wallet/payment` using the stored `cardToken`.
- **AND** the request payload SHALL specify `cardToken`, `amount` (calculated dynamic UAH equivalent for the tariff plan in minor units), `ccy` (980 for UAH), and `initiationKind` as `"merchant"`.
- **AND** the system SHALL store the returned `invoiceId` as the subscription's `lastInvoiceId` in the database.
- **AND** if the payment completes successfully, the system SHALL update `currentPeriodEnd` by adding the subscription interval (1 month or 1 year) and reset `failedAttemptsCount` to 0.
- **AND** the system SHALL send a Telegram alert to the administrator about the successful recurring payment (containing client profile data: name, website, phone, email, time, Telegram nickname, and payment details: amount, transaction time).

### Requirement: Failed Recurring Payment Retry Logic
The system SHALL handle failed recurrent billing attempts by scheduling up to 2 retries within 48 hours. If all retries fail, the subscription SHALL transition to `suspended` status.

#### Scenario: Recurrent payment fails, schedules retries, and suspends after exhaustion
- **WHEN** a recurring billing attempt fails (or the transaction status is returned as `failure` / `expired`)
- **THEN** the system SHALL increment `failedAttemptsCount` and set `lastFailedAttemptAt` to the current time.
- **AND** if `failedAttemptsCount` is less than or equal to 2, the system SHALL schedule another payment attempt (e.g. 24 hours later) without changing the subscription status.
- **AND** the system SHALL trigger a user notification in Telegram warning that the auto-billing attempt has failed and the service will be suspended if not resolved (the alert MUST contain a direct billing dashboard link to update card details and retry, using a calm tone without exclamation marks).
- **AND** if `failedAttemptsCount` exceeds 2, the system SHALL change the subscription status to `'suspended'` and trigger a user notification indicating that the conversion transfer service has been suspended due to payment failures (the alert MUST contain a link to the billing dashboard to pay and restore the service, using a calm tone without exclamation marks).

### Requirement: Pausing Subscriptions
The system SHALL allow users to pause their active subscription. When paused, the system SHALL disable future recurrent billing, keep the card token, allow service usage until the current period ends, and change the status to `paused` at the end of the current period.

#### Scenario: User pauses active subscription
- **WHEN** a user clicks the "Pause Subscription" button in the dashboard
- **THEN** the system SHALL set `autoRenew` to `false` in the database, but keep the status as `'active'` (or `'active'` with a pause pending state) to allow service usage until `currentPeriodEnd`.
- **AND** the system SHALL send a Telegram alert to the administrator about the subscription pause (containing client profile data: name, website, phone, email, time, Telegram nickname, where mail/website/nickname are fetched from DB, and other data from current transaction).
- **AND** the cron job SHALL skip this subscription for recurrent billing runs since `autoRenew` is `false`.
- **AND** when `currentPeriodEnd` is reached, the cron job SHALL transition the status in the database to `'paused'`.
- **AND** the system SHALL trigger a user notification in Telegram indicating that the conversion transfer service has been paused (containing a link to restore, using a calm tone without exclamation marks).

### Requirement: Cancelling Subscriptions
The system SHALL allow users to cancel their subscription after confirming a warning modal. When cancelled, the status SHALL change to `cancelled` immediately, and the card token SHALL be deleted from Monobank wallet using `DELETE /api/merchant/wallet/card` after the current paid period ends.

#### Scenario: User cancels active subscription
- **WHEN** a user clicks the "Cancel Subscription" button, and confirms the warning modal on the dashboard stating that conversion transfer will stop and advertisement efficiency will drop
- **THEN** the system SHALL change the subscription status to `'cancelled'` immediately in the database.
- **AND** the system SHALL send a Telegram alert to the administrator about the subscription cancellation (containing client profile data: name, website, phone, email, time, Telegram nickname).
- **AND** the system SHALL allow the user to use the service until `currentPeriodEnd`.
- **AND** the cron job SHALL skip this subscription for recurrent billing runs since it is cancelled.
- **AND** when the paid period ends (`currentPeriodEnd <= NOW()`), the cron job SHALL check if `cardToken` is present, and if so, send a `DELETE` request to Monobank Acquiring API `DELETE /api/merchant/wallet/card` using the saved `cardToken`.
- **AND** it SHALL remove `cardToken` and `walletId` from the user's `subscriptions` record in the database.
- **AND** the system SHALL trigger a user notification in Telegram indicating that the conversion transfer service has been cancelled (containing a link to pay/re-activate, using a calm tone without exclamation marks).

### Requirement: Resuming Subscriptions
The system SHALL allow users to resume paused, cancelled, or suspended subscriptions.

#### Scenario: User resumes active or paused subscription within the paid period
- **WHEN** a user clicks the "Resume Subscription" button in the dashboard, and `NOW() < currentPeriodEnd` (for a paused or cancelled subscription that has not yet reached its end date)
- **THEN** the system SHALL set `autoRenew` to `true` and restore the subscription status to `'active'` in the database.
- **AND** the system SHALL send a Telegram alert to the administrator about the subscription renewal/resumption (containing client profile data: name, website, phone, email, time, Telegram nickname).
- **AND** the system SHALL NOT charge the user immediately.

#### Scenario: User resumes subscription after the paid period ends (status paused or suspended)
- **WHEN** a user clicks the "Resume Subscription" button, and `NOW() >= currentPeriodEnd` (for a `'paused'` or `'suspended'` subscription, where `cardToken` and `walletId` are still present in the database)
- **THEN** the system SHALL calculate the dynamic UAH amount for the tariff plan.
- **AND** the system SHALL execute a recurrent payment request to Monobank Acquiring API `POST /api/merchant/wallet/payment` using the stored `cardToken`.
- **AND** the request payload SHALL specify `cardToken`, `amount` (calculated dynamic UAH equivalent), `ccy` (980 for UAH), and `initiationKind` as `"merchant"`.
- **AND** the system SHALL store the returned `invoiceId` as the subscription's `lastInvoiceId` in the database.
- **AND** if the payment completes successfully (`status` is returned as `success`), the system SHALL update the subscription status to `'active'`, reset `failedAttemptsCount` to 0, update `currentPeriodEnd` to 1 month or 1 year from the transaction completion.
- **AND** the system SHALL send a Telegram alert to the administrator about the subscription renewal and payment success (containing client profile data and payment details: amount, transaction time).
- **AND** if the payment requires 3DS verification (`status` is returned as `processing` with a non-null `tdsUrl`), the system SHALL redirect the user to the provided `tdsUrl` to complete the authentication.
- **AND** if the payment fails, the system SHALL show an error to the user and keep the subscription in its current state.

#### Scenario: User resumes cancelled subscription after the paid period ends
- **WHEN** a user clicks the "Resume Subscription" button, and `NOW() >= currentPeriodEnd` for a `'cancelled'` subscription (where `cardToken` and `walletId` have been deleted from the database)
- **THEN** the system SHALL request invoice creation via Monobank Acquiring API `POST /api/merchant/invoice/create` with `saveCardData.saveCard: true` for the dynamic UAH equivalent of the selected tariff plan.
- **AND** it SHALL retrieve the `invoiceId` and `pageUrl` from the response.
- **AND** it SHALL update the user's `subscriptions` record in the database with the `lastInvoiceId` set to `invoiceId`, status set to `'created'`, and `currentPeriodEnd` set to the current time.
- **AND** it SHALL redirect the user to the provided `pageUrl` for payment and card tokenization.

---

## Verification & Testing Plan

### Automated Tests
- Mock the Monobank Acquiring HTTP client. Verify that:
  - `POST /api/merchant/invoice/create` receives `saveCardData.saveCard: true`.
  - `POST /api/merchant/wallet/payment` receives `cardToken`, `amount`, `ccy` (980), and `initiationKind: "merchant"`.
  - `DELETE /api/merchant/wallet/card` receives the correct `cardToken`.
- Webhook tests:
  - Test validation of valid ECDSA signature using `X-Sign` header and request body.
  - Test webhook key rotation logic by mocking validation failure with cached key, fetching a new key, and retrying.
  - Verify webhook parses `walletData` correctly and stores `cardToken` and `walletId` in DB.
- Cron tests:
  - Mock time progression. Verify that active subscriptions with `autoRenew: true` are charged, while paused/cancelled subscriptions are skipped and transition to their respective target states when period ends.
  - Verify that failed charges increment retry count and trigger intermediate notifications.

### Manual Verification
- Deploy to a staging environment and use Monobank Acquiring Sandbox token to make real checkout attempts.
- Use a tool like ngrok to tunnel webhook requests to local environment. Verify signature validation.
- Emulate webhook events with different terminal statuses and verify database changes.

---

## Definition of Done

- All 4 database schemas (`users`, `magic_links`, `sessions`, `subscriptions`, `conversions`) are aligned, and a database migration is created to add `'created'` to the `subscription_status` enum.
- HTTP client wrapper for Monobank Acquiring API is implemented and tested.
- ECDSA signature verification for the `X-Sign` webhook header is implemented using native `crypto` library and tested against key rotation.
- Webhook, pause, and cancellation API routes are implemented and secure.
- Cron job for recurring billing, retry queue, and period-end lifecycle cleanup (token deletion) is implemented.
- Telegram notification triggers for admin and users are implemented.
- Dashboard billing interface with tariff selection, status display, and action buttons is fully responsive and matches the "Precision Hub" design guidelines.

