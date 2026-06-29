# ADR-0007 — Postgres source of truth, Notion async mirror

*Status: Accepted · Date: 2026-06-28 · Source: requirements.md §8.0, §9, prd.md US-10*

## Context
The project is ported from a Notion-based coaching system, and the user still wants data visible in
Notion. But Notion's API is rate-limited (~3 req/s) and can fail; making it part of the write path
would slow replies and risk data loss. The bot also must never "remember" via chat history — facts
and totals have to come from a queryable store.

## Decision
**PostgreSQL is the single source of truth; Notion is a best-effort, asynchronous mirror.**
- Every successful Postgres write enqueues a Notion sync job.
- A background worker writes the Notion page, respecting the rate limit, with retry + backoff.
- The user is confirmed the instant **Postgres** succeeds — Notion never blocks the reply.
- Failed Notion writes retry; failure never loses data (it's safe in Postgres).
- Mirror is feature-flagged per user. Token lives in env, never in the DB.
- Corollary: **the database is the memory** — totals come from SQL `SUM`, never from re-reading chat,
  and the LLM writes prose only (see [ADR-0003](./0003-raw-anthropic-api-no-agent-framework.md)).

## Consequences
- **+** Fast, reliable replies independent of Notion's availability.
- **+** No data loss on Notion outages; durability owned by Postgres + backups.
- **+** Mirror can be turned off without touching the core loop.
- **−** Notion can lag Postgres (eventual consistency) — acceptable for a mirror.
- **−** Extra moving parts: a sync queue + worker to build and operate.

## Alternatives considered
- **Notion as primary store** (the original system) — rejected: rate limits, latency, no SQL math,
  no transactional guarantees.
- **Synchronous Notion writes** — rejected: would block replies and couple uptime to Notion.
