# ADR-0004 — Self-hosted PostgreSQL on Coolify/Hetzner

*Status: Accepted · Date: 2026-06-28 · Source: requirements.md §6, §7*

## Context
The bot stores sensitive body metrics and progress observations. It needs a durable relational
store, but the data volume is tiny (kilobytes/day). The user already runs a Hetzner box with
Coolify. External managed free tiers (Supabase, Neon, etc.) impose pause/row/bandwidth caps and
place sensitive data on third-party infra.

## Decision
Run **PostgreSQL as a Coolify-managed resource on the user's own Hetzner server**, in a dedicated
`nutrition-bot` Coolify project (separate from the crypto-bot).

Tuning (because the box is RAM-tight): `shared_buffers=64MB`, `max_connections=20`, `work_mem=4MB`,
`effective_cache_size=128MB`, container hard memory limit **256 MB**. Backups: Coolify scheduled
`pg_dump` → existing S3 target (the only copy — set up from day one).

## Consequences
- **+** No external caps; sensitive data stays on infra the user controls.
- **+** ~$0 marginal cost (reuses existing hardware).
- **+** Low latency to the co-located app.
- **−** Operational ownership: backups, tuning, and the OOM risk are the user's to manage
  (mitigated by hard caps — see [ADR-0006](./0006-build-off-box-ghcr.md)).
- **−** No managed HA/failover; acceptable at this scale.

## Alternatives considered
- **Managed free-tier Postgres** — rejected: usage caps and third-party custody of sensitive data.
