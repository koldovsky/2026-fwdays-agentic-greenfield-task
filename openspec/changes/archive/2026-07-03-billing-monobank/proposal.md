## Why

To enable subscription management and payment processing via the Monobank Acquiring API. This allows the platform to monetize by supporting Monthly ($10.99) and Yearly ($120) subscription tiers in UAH equivalent, utilizing recurrent merchant-initiated transactions.

## What Changes

- Integration with the Monobank Acquiring API for card tokenization and verification.
- Database updates to store user subscription states (`cardToken`, `walletId`, status, expiration).
- Background Cron process to trigger recurring merchant-initiated billing.
- Automatic retry logic (2 retries within 48 hours) upon failed recurrent transactions.
- Customer dashboard options to pause (stop future billing, active until period end) or cancel (modal warning, delete token, status cancelled) subscriptions.
- Telegram notifications to both users and administrators for billing-related lifecycle events.

## Capabilities

### New Capabilities
- `billing-monobank`: Subscription management and payment processing via the Monobank Acquiring API, including recurring billing, pausing, cancellation, card token cleanup, and status handling.

### Modified Capabilities

## Impact

- Database layer: `users` and `subscriptions` schema updates to store billing-specific tokens and states.
- API layer: New Next.js Route Handlers to create invoices, receive webhooks (with signature verification), manually pause/cancel/resume subscriptions, and query status.
- Cron/Background job: Scheduled task to handle automatic recurrent billing and retries.
- Dependencies: Adding cryptographic ECDSA library (e.g., `elliptic` or using native Web Crypto APIs) for Monobank webhook signature verification.
- Frontend: A subscription management interface inside the user's dashboard.
