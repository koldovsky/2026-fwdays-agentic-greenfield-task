# Design — Docker dev environment

## Context

Three dev/deploy database-and-queue concerns intersect:

1. **Local Postgres.** Today `scripts/dev-pglite-server.mjs` serves an
   in-process pglite over TCP (:5544) and applies migrations. Great
   zero-install DX; but in-memory (state lost per restart) and not full
   PostgreSQL (TC-STACK-05 targets real PG semantics).
2. **Local Redis.** The target pipeline queues tailoring jobs via BullMQ +
   Redis (TC-STACK-04) and gates free usage with Redis counters
   (FR-PAYWALL-01, NFR-COST-02). No pglite-style stand-in exists.
3. **Worker deploy.** The BullMQ consumer is a long-lived Node process. The
   web app deploys via Vercel git integration (TC-DEPLOY-01); the worker
   cannot, so it needs its own packaging.

## Goals / Non-Goals

**Goals**
- One-command local parity services: `docker compose up` → Postgres 16 + Redis 7.
- Preserve the zero-install pglite path for contributors without Docker.
- Define the containerization boundary now so later work doesn't drift:
  worker containerized, web never.

**Non-Goals**
- No web-app Dockerfile, no self-hosted web deploys.
- No CI/testcontainers work in this increment (may follow separately).
- No Kubernetes/orchestration; a single compose file for dev only.

## Decisions

### D1 — Compose for dev services, not for the app
`docker-compose.yml` runs only backing services (postgres, redis). The Next.js
dev server keeps running on the host (`yarn dev`) for fast HMR. Containerizing
the dev app would slow the loop and buy nothing (the app deploys to Vercel).

### D2 — pglite stays the default; compose is the parity option
`yarn dev:db` remains the documented first path (zero install). Compose is for:
schema work needing real PG behavior, queue work needing Redis, and long-lived
local data. `DATABASE_URL` selects the backend; the app code is identical
(`pg` Pool either way — the `Queryable` port doesn't change).

### D3 — Security posture (defense-in-depth, dev included)
- Ports bound to `127.0.0.1` only — nothing listens on external interfaces.
- Images version-pinned (`postgres:16-alpine`, `redis:7-alpine`); no `latest`.
- Dev-only credentials, plainly named as such (e.g. user `vouch_dev`), set via
  compose environment defaults; never reused outside local dev. Secrets for
  real environments stay out of the repo entirely.
- Named volume for Postgres data; `docker compose down -v` is the documented
  reset (destructive, called out in docs).

### D4 — Worker Dockerfile deferred until the worker exists
`add-agent-loop` ships an inline route-handler MVP first. The Dockerfile lands
with the BullMQ graduation: multi-stage build (deps → build → runtime),
`USER node` (non-root), production dependencies only, no `.env*` or secrets in
the image, config via runtime environment. Registry/host choice (container
platform) is out of scope here and tracked with the deploy decision.

## Risks / Trade-offs

- **Two dev DB paths** (pglite vs compose) can drift → mitigated: same
  migrations directory applied by both; `docs/dev-setup.md` states pglite is
  authoritative for quick starts, compose for parity.
- **Docker not installed** for some contributors → non-blocking by design
  (D2).
- **Compose creds committed** → acceptable only because they are dev-only,
  localhost-bound, and clearly labeled; production credentials never appear in
  the repo.

## Open Questions

- Worker container host (ties to the undecided deploy/MoR stack rows) — decide
  when the worker graduates to BullMQ.
- Whether CI should run integration tests against compose services or
  testcontainers — separate change.
