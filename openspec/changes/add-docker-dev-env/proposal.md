# Docker dev environment

## Why

Local development currently runs against an in-memory pglite stand-in
(`yarn dev:db`). That is a deliberately thin bridge: data resets on every
restart, it is not full PostgreSQL (parity risk for extensions and
concurrency), and there is no equivalent stand-in at all for Redis — which the
target tailoring pipeline requires for the BullMQ queue (TC-STACK-04) and for
rate-limit/usage counters (FR-PAYWALL-01, NFR-COST-02). The queue worker is a
long-lived Node process (TC-STACK-04) that cannot ship via the Vercel git
integration the web app uses (TC-DEPLOY-01), so it needs a portable deploy
unit. Docker closes both gaps without touching the web app's deploy story.

Decision summary — where Docker is and is not needed:

| Concern | Docker? | Rationale |
|---------|---------|-----------|
| Web app deploy | No | Vercel git integration (TC-DEPLOY-01) |
| Local Postgres parity | Yes (compose) | pglite is in-memory, not full PG (TC-STACK-05) |
| Local Redis | Yes (compose) | no stand-in exists; BullMQ needs it (TC-STACK-04) |
| Worker deploy | Yes (Dockerfile, later) | long-lived Node process, not Vercel-hostable |
| Zero-install dev path | Keep pglite | contributors without Docker stay unblocked |

## What Changes

- Add `docker-compose.yml` for local dev services: PostgreSQL 16 and Redis 7,
  bound to `127.0.0.1` only, version-pinned images, named volume so data
  survives restarts. Dev-only credentials documented as such.
- Keep the pglite path (`yarn dev:db`) as the zero-install default; compose is
  the parity option. `docs/dev-setup.md` documents both.
- Add a worker `Dockerfile` **only when the queue worker exists** (after
  `add-agent-loop` graduates from the inline route-handler MVP to BullMQ):
  multi-stage build, non-root user, production dependencies only, no secrets
  baked into the image.
- No web-app Dockerfile. No CI changes in this increment.

## Capabilities

### New Capabilities

- `dev-environment`: reproducible local dev services (Postgres + Redis via
  Docker Compose), the preserved zero-install pglite path, and the
  containerization boundary (worker containerized, web not).

### Modified Capabilities

_None._

## Impact

- Code: new `docker-compose.yml` (repo root), later `worker/Dockerfile`;
  `docs/dev-setup.md` gains a compose section. No `src/` changes.
- Dependencies: none in the app; Docker Desktop/Engine becomes an optional
  (not required) dev prerequisite.
- Security: services localhost-bound; dev-only credentials never reused in
  production; images version-pinned; worker image non-root with no secrets
  (defense-in-depth; NFR-SEC-01 posture unchanged — encryption stays in the app).
- Scheduling: **implement when queue work starts** (BullMQ/Redis stand-up,
  after the `add-agent-loop` inline MVP). Until then pglite remains the
  supported dev path; this change is spec-only.
