# Proposal: S-01 · Walking Skeleton and Production Deploy

> Plan item: **S-01 «Хребет застосунку і прод-деплой»** (cycle Е-1) from
> [docs/mvp-capability-plan.md](../../../docs/mvp-capability-plan.md).
> PRD codes covered: **TC-STACK-01**, **TC-STACK-02**, **TC-OPS-01**,
> **NFR-SEC-04**, **NFR-REL-01** (backups), **NFR-OBS-01** (health part).

## Why

The repo is a fresh Nx scaffold (hello-world Angular + NestJS) with no database,
no Docker image, and no production environment. Every later slice (S-02…S-08)
assumes it can land on `main` and be immediately deployable; that is only
possible once a "walking skeleton" exists — an empty but alive application in
production with a DB connection and a health check. S-01 builds that skeleton
so all subsequent slices only add domain behavior, never infrastructure.

## What Changes

- **API**: `GET /api/health` endpoint reporting app liveness and MySQL
  connectivity (`ok` / DB status), used by Railway health checks (NFR-OBS-01).
- **DB**: Prisma wired into the NestJS app; MySQL as the datastore
  (TC-STACK-01); an empty-but-real schema with the first migration applied
  both locally and in prod. Prod DB backups delegated to Railway daily backups
  (NFR-REL-01).
- **Web**: hello/landing page built with the chosen UI kit — this slice closes
  open question В-01 (UI kit selection, delegated to agentic development;
  fixed by a new ADR during implementation).
- **Single container**: NestJS serves the built SPA static files from the same
  process — one service, one container, no reverse proxy (TC-STACK-02).
- **Local dev**: `docker-compose` with local MySQL; a single documented
  command starts the app on a clean clone.
- **Deploy**: multi-stage `Dockerfile`; Railway service (app + MySQL + Volume
  placeholder for future attachments); all secrets/config via env vars only
  (TC-OPS-01, NFR-SEC-04).

## Capabilities

### New Capabilities

- `app-skeleton`: application backbone — health endpoint with DB connectivity
  status, SPA served statically by the API process, Prisma/MySQL wiring with
  migrations, one-command local start, and production deploy on Railway with
  env-only configuration.

### Modified Capabilities

_None — this is the first slice; `openspec/specs/` is empty._

## Impact

- `api/` — health module, Prisma service/module, static file serving config.
- `web/` — hello page on the chosen UI kit (В-01 closed by ADR).
- New artifacts: `Dockerfile`, `docker-compose.yml`, `api/prisma/` schema +
  baseline migration, `.env.example`.
- `docs/adr/` — new ADR: UI kit choice; `docs/assumptions-open-questions.md`
  — В-01 marked closed.
- Railway project: app service + MySQL plugin + Volume; env vars set there.
- No breaking changes; no domain model, no auth (non-goals below).

## Non-goals

- Domain model (houses, tickets, feed, attachments) — S-03…S-07.
- Authentication/OTP, sessions, guards — S-02.
- Any product functionality beyond the hello page.
- Structured request/error logging (NFR-OBS-01 full scope) — S-08.
- Horizontal scaling, reverse proxy, S3 — excluded by TC-STACK-02/TC-MEDIA-01.
