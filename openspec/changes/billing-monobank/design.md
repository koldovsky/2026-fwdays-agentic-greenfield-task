## Context

Integrating the Monobank Acquiring API allows the platform to handle subscriptions using credit card tokenization. The system must support two billing tiers, automatic recurrent billing via background processes, payment retries, plan status lifecycle (Active, Paused, Suspended, Cancelled), and webhook signature validation.

## Goals / Non-Goals

**Goals:**
- Provide Monthly ($10.99) and Yearly ($120) subscription tiers in UAH.
- Tokenize cards during initial subscription payment using Monobank's `saveCard` feature.
- Securely store card tokens and wallet IDs.
- Execute automatic recurring payments on expiration dates using merchant-initiated requests.
- Implement a retry queue for failed recurrent payments (up to 2 retries within 48 hours).
- Implement pause, cancellation (deleting card tokens on period end), and resumption logic.
- Verify Monobank webhook authenticity using ECDSA signature verification.

**Non-Goals:**
- Direct card collection (non-hosted checkout) which would require PCI DSS compliance.
- Support for other payment processors.
- Multi-currency transactions (the checkout is in UAH equivalent).

## Decisions

### Decision 1: Cryptographic signature verification using native Node.js `crypto`
- **Alternative:** External packages like `elliptic` or `jsrsasign`.
- **Rationale:** Native Node.js `crypto` is performant and secure. The public key returned by Monobank `GET /api/merchant/pubkey` is a base64-encoded X.509 ASN.1 public key. Once base64-decoded, it contains standard PEM delimiters which Node.js `crypto.verify` can consume directly to verify ASN.1 signature payloads.

### Decision 2: Idempotency of Webhook handler
- **Alternative:** Processing webhook status changes blindly.
- **Rationale:** Monobank may retry webhook delivery up to 3 times. We must track the payment status of each `invoiceId` (saving `last_invoice_id` and verifying if the target status is already updated in the database) to avoid double provisioning or erroneous status triggers.

### Decision 3: Recurrent cron job scheduling
- **Alternative:** Polling or on-demand payment triggers when a user attempts an action.
- **Rationale:** A cron job scheduled once daily detects subscriptions where `current_period_end <= NOW()`. It executes the `POST /api/merchant/wallet/payment` token-based payment with `initiationKind: "merchant"`. This ensures uninterrupted synchronization services.

### Decision 4: Graced retry strategy for failed payments
- **Alternative:** Transitioning to `suspended` immediately on first failure.
- **Rationale:** Cards frequently fail due to temporary conditions (insufficient funds, temporary bank limits). Transitioning to `suspended` immediately degrades service. A 48-hour retry queue (2 subsequent attempts spaced 24 hours apart) with proactive notifications gives the user time to top up or update their card.

### Decision 5: Complete token deletion on expiration
- **Alternative:** Storing card tokens indefinitely for future restarts.
- **Rationale:** When a user cancels their subscription, the token must be deleted at the end of the paid period using `DELETE /api/merchant/wallet/card`. Keeping inactive tokens exposes unnecessary risk and violates privacy compliance.

## Risks / Trade-offs

- **[Risk] Webhook delivery failure or delay** → **[Mitigation]** Standard fallback verification: when the cron job runs, it polls `GET /api/merchant/invoice/status` for any subscription with a pending `created` or `processing` status to reconcile its state before taking action.
- **[Risk] Currency conversion and price volatility** → **[Mitigation]** The pricing tiers ($10.99/mo, $120/yr) are converted to UAH equivalent dynamically. The exchange rate will be queried from a reliable service (or a stable fallback conversion factor) when generating the invoice.
- **[Risk] Insufficient funds during recurring payment** → **[Mitigation]** The subscriber is immediately notified in their Telegram bot about the failed payment with a direct billing dashboard link to update card details or retry manually.
