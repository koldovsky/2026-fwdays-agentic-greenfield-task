# ADR-0014 — Long-polling instead of Telegram webhook

*Status: Accepted · Date: 2026-06-29 · Supersedes the delivery decision in
[ADR-0002](./0002-grammy-telegram-client.md) §Decision · Source: provision (M0) Coolify setup*

## Context
The original design (ADR-0002, requirements §7) delivered Telegram updates via **webhook**, relying
on "Coolify provides a public HTTPS URL." In practice the only free URL Coolify hands out is an
**`sslip.io`** host. Let's Encrypt **rate-limits the shared `sslip.io` apex**, so certificate
issuance/validation fails — the webhook cannot get valid TLS, and Telegram refuses webhooks without
it. We do **not** own a domain to point at the box, and self-signed certs (Telegram allows them via
the `certificate` param) add cert-gen + renewal toil and keep a public inbound port open.

The bot is **single-owner, low-traffic**, on a **RAM-tight box** co-resident with another project.
The efficiency argument for webhooks (no idle polling at high volume) is irrelevant at one user.

## Decision
Deliver Telegram updates via **long-polling** (`getUpdates`, grammY `bot.start()`), not webhook.

The bot opens an **outbound** long-poll connection to `api.telegram.org`; nothing inbound is
required. The Coolify app needs **no public domain, no exposed ingress, no TLS cert**. It still
exposes `PORT=3000` for a **minimal internal `/health` HTTP server** so Coolify's healthcheck has a
liveness probe — this port is **not** publicly routed.

## Consequences
- **+** Removes the whole TLS/domain/cert blocker — no Let's Encrypt, no `sslip.io` rate limit.
- **+** No public inbound attack surface (no exposed webhook endpoint).
- **+** Drops `TELEGRAM_WEBHOOK_SECRET` and the `setWebhook` registration step from `pipe`.
- **−** A persistent outbound connection + idle `getUpdates` long-poll (negligible CPU/RAM for one
  user; well within the 512 MB bot cap).
- **−** Slightly higher delivery latency than a push webhook (immaterial for this UX).
- Reversible: if a real owned domain is added later, switch back to webhook (re-instate ADR-0002's
  delivery path + the secret) — grammY supports both with the same handlers.

## Alternatives considered
- **Webhook + owned domain** — rejected for now: we don't control a domain to A-record at the box.
  The cleanest path *if* a domain appears; revisit then.
- **Webhook + self-signed cert on `sslip.io`** — rejected: cert-gen/renewal toil and keeps a public
  inbound port for no benefit at single-user scale.
