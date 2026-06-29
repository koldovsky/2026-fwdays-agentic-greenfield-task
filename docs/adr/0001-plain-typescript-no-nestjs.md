# ADR-0001 — Plain TypeScript, no NestJS

*Status: Accepted · Date: 2026-06-28 · Source: requirements.md §4*

## Context
The bot deploys to a RAM-constrained Hetzner box (3.7 GiB total, ~1.8 GiB available, 1.3 GiB
swap already in use) that **also** runs PostgreSQL and a separate crypto-bot (backend, frontend,
Redis, MySQL). RAM is the binding constraint. The app's job is small: a Telegram message router,
a few services, and one cron.

## Decision
Build with **plain TypeScript + Node.js** and folder discipline, not NestJS or any application
framework. Structure lives in a `src/` layout (`bot/`, `food/`, `metrics/`, `reviews/`, `llm/`,
`notion/`, `db/`, `config/`), enforced by convention.

## Consequences
- **+** Lower memory: plain grammY app idles ~60–100 MB RSS vs NestJS ~150–250 MB — critical when
  fighting Postgres + mysqld for residency.
- **+** Lighter/faster builds, smaller images, smaller deploy spikes.
- **+** No DI/module overhead for a project this size.
- **−** Less out-of-the-box structure; relies on team discipline to keep modules clean.
- **−** Porting to NestJS later is a deliberate migration (judged straightforward, deferred).

## Alternatives considered
- **NestJS** — rejected: DI/module machinery is overhead at this scale and costs 2–3× idle RAM.
