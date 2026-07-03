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
The system SHALL support two subscription tariff plans: Monthly (valued at $10.99/month in UAH equivalent) and Yearly (valued at $120/year in UAH equivalent). The UAH amount SHALL be dynamically determined or defined in UAH equivalent minor units (kopecks) when creating invoices.

#### Scenario: Tariff plans definition and pricing check
- **WHEN** a subscription registration is initiated for a selected tariff plan
- **THEN** the system SHALL calculate the UAH equivalent amount in minor units (kopecks).
- **AND** the Monthly plan equivalent SHALL target approximately 10.99 USD in UAH kopecks.
- **AND** the Yearly plan equivalent SHALL target approximately 120.00 USD in UAH kopecks.

### Requirement: Invoice Creation for Card Tokenization
To initiate a subscription, the system SHALL request invoice creation via Monobank Acquiring API `POST /api/merchant/invoice/create` and specify `saveCardData: { saveCard: true }` in order to request card tokenization.

#### Scenario: Invoice creation with card tokenization requested
- **WHEN** a user initiates a Monthly subscription purchase
- **THEN** the system SHALL call the Monobank invoice creation API with `saveCardData.saveCard: true`.
- **AND** it SHALL retrieve the `invoiceId` and `pageUrl` from the response.
- **AND** it SHALL update the user's `subscriptions` record in the database with the `last_invoice_id` set to `invoiceId`, plan set to 'monthly', status set to 'created', and current period end set to the current time.
- **AND** it SHALL redirect the user to the provided `pageUrl` for payment.

### Requirement: Monobank Webhook Processing and ECDSA Signature Verification
The system SHALL expose a webhook endpoint to receive payment updates from Monobank. The system SHALL verify the authenticity of all webhooks by checking the `Signature` header against the request body using Monobank's public key (fetched from `GET /api/merchant/pubkey` and cached).

#### Scenario: Successful payment webhook updates database subscription
- **WHEN** a webhook POST request with a valid ECDSA signature is received on `/api/billing/webhook` with status `success`
- **THEN** the system SHALL lookup the subscription by `invoiceId` matching `last_invoice_id`.
- **AND** it SHALL extract `cardToken` and `walletId` from the webhook payload's `paymentInfo`.
- **AND** it SHALL persist the `cardToken` and `walletId` in the database `subscriptions` record.
- **AND** it SHALL update the subscription status to `active` and set `current_period_end` to the appropriate date (1 month or 1 year from the transaction completion).
- **AND** it SHALL respond with HTTP status `200 OK` to Monobank.

### Requirement: Automated Recurring Billing (Cron)
The system SHALL run a scheduled process (Cron) to initiate recurrent merchant billing for active subscriptions on their end date, via Monobank Acquiring API `POST /api/merchant/wallet/payment` with `initiationKind: "merchant"`.

#### Scenario: Cron triggers successful recurring payment
- **WHEN** the cron job runs and identifies a subscription with status `active` and `current_period_end` less than or equal to the current time
- **THEN** the system SHALL execute a recurrent payment request to Monobank using the stored `cardToken` and `walletId`.
- **AND** the request payload SHALL specify `initiationKind` as `"merchant"`.
- **AND** if the payment completes successfully, the system SHALL update `current_period_end` by adding the subscription interval (1 month or 1 year) and reset `failed_attempts_count` to 0.

### Requirement: Failed Recurring Payment Retry Logic
The system SHALL handle failed recurrent billing attempts by scheduling up to 2 retries within 48 hours. If all retries fail, the subscription SHALL transition to `suspended` status.

#### Scenario: Recurrent payment fails, schedules retries, and suspends after exhaustion
- **WHEN** a recurring billing attempt fails (or the transaction status is returned as `failure` / `expired`)
- **THEN** the system SHALL increment `failed_attempts_count` and set `last_failed_attempt_at` to the current time.
- **AND** if `failed_attempts_count` is less than or equal to 2, the system SHALL schedule another payment attempt (e.g. 24 hours later) without changing the subscription status.
- **AND** if `failed_attempts_count` exceeds 2, the system SHALL change the subscription status to `suspended` and trigger a user notification indicating that the service has been suspended due to payment failures.

### Requirement: Pausing Subscriptions
The system SHALL allow users to pause their active subscription. When paused, the system SHALL disable future recurrent billing, keep the card token, allow service usage until the current period ends, and change the status to `paused` at the end of the current period.

#### Scenario: User pauses active subscription
- **WHEN** a user clicks the "Pause Subscription" button in the dashboard
- **THEN** the system SHALL set the subscription status to `paused` in the database, but keep the active access flag or allow service use until `current_period_end`.
- **AND** the cron job SHALL skip this subscription for recurrent billing runs since it is marked as `paused`.

### Requirement: Cancelling Subscriptions
The system SHALL allow users to cancel their subscription after confirming a warning modal. When cancelled, the status SHALL change to `cancelled`, and the card token SHALL be deleted from Monobank wallet using `DELETE /api/merchant/wallet/card` after the current paid period ends.

#### Scenario: User cancels active subscription
- **WHEN** a user clicks the "Cancel Subscription" button, confirms the warning modal on the dashboard, and the paid period ends
- **THEN** the system SHALL change the subscription status to `cancelled`.
- **AND** it SHALL send a `DELETE` request to Monobank Acquiring API `DELETE /api/merchant/wallet/card` using the saved `cardToken`.
- **AND** it SHALL remove `cardToken` and `walletId` from the user's `subscriptions` record in the database.
