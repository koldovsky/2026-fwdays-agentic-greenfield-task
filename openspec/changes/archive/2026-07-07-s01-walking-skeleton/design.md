# Design: S-01 · Walking Skeleton and Production Deploy

## Context

Fresh Nx scaffold: hello-world Angular 21 app (`web/`) and NestJS app (`api/`,
global prefix `/api`, port 3000). No DB, no Docker, no deploy target. Fixed by
ADRs (do not re-decide): Nx + Angular + NestJS + Prisma + MySQL (ADR-0001),
single service/container with NestJS serving SPA statics (ADR-0002), local +
prod environments only, Docker image on Railway, secrets via env vars only
(ADR-0005). Frontend conventions: zoneless + OnPush, standalone components,
signals (ADR-0009).

## Goals / Non-Goals

**Goals:**

- An empty but alive app in production: SPA renders, `/api/health` is green,
  MySQL connection is live (acceptance scenarios of S-01).
- One-command local start on a clean clone.
- The migration pipeline proven end-to-end (local and prod) so S-02+ only add
  models.

**Non-Goals:**

- Domain model, auth, structured logging, attachments handling (later slices).
- CI/CD pipeline — deploys are manual/Railway-triggered for the POC.

## Decisions

### D1. UI kit: Angular Material (closes В-01)

- **What:** Angular Material v21 (+ CDK), Material 3 theming, as the UI kit
  for all SPA screens starting with the S-01 hello page.
- **Why:** first-party Angular project — guaranteed compatibility with
  Angular 21, zoneless and OnPush (ADR-0009); solid mobile/a11y defaults for
  the mobile-first UI (TC-UI-01); no extra design dependencies — fits
  BC-PRIN-01 ("no more complex than a notebook").
- **Alternatives:** PrimeNG — larger component set but third-party release
  cadence and heavier theming; plain SCSS — no component cost but every
  widget (dialogs, selects, snackbars needed from S-02 on) becomes custom
  work. Rejected both.
- **Recorded as:** new ADR (`docs/adr/`) during implementation + В-01 closed
  in `docs/assumptions-open-questions.md`.

### D2. Prisma schema lives in `api/prisma/`, baseline migration is empty

- **What:** `api/prisma/schema.prisma` (datasource MySQL, client generator,
  no models yet) + an empty baseline migration `0_init` created with
  `prisma migrate dev --create-only`.
- **Why:** the schema is owned by the api app, not the workspace root. An
  empty baseline creates the `_prisma_migrations` table and proves the whole
  migrate pipeline (local dev → prod deploy) without inventing junk tables;
  S-02 adds the first real models on top.
- **Alternative:** placeholder table to make the migration "non-empty" —
  rejected as noise that S-02 would immediately have to clean up.

### D3. Health check: hand-rolled controller, DB-aware status code

- **What:** `GET /api/health` in a `HealthModule`; runs `SELECT 1` through
  `PrismaService`. Returns `200 {"status":"ok","db":"up"}` when DB is
  reachable, `503 {"status":"error","db":"down"}` otherwise. Railway
  healthcheck path points at it.
- **Why:** NFR-OBS-01 needs exactly one health endpoint; `@nestjs/terminus`
  adds a dependency and indirection for one query (BC-PRIN-01). 503 on DB
  loss makes Railway restarts/alerts meaningful — an app that cannot reach
  MySQL is not serving the product.

### D4. SPA serving: `@nestjs/serve-static` in the API process

- **What:** `ServeStaticModule` serving the `web` build output; `/api/*`
  excluded; unknown non-API paths fall back to `index.html` (SPA routing).
  Unknown `/api/*` paths keep returning NestJS JSON 404.
- **Why:** ADR-0002 fixes single service/container; serve-static is the
  standard Nest mechanism, no reverse proxy. In the Docker image the web
  build is copied next to the api bundle; the static root is resolved via env
  with a sane default so local prod-mode and container use the same code
  path.

### D5. Local dev: docker-compose for MySQL only, dev servers via Nx

- **What:** `docker-compose.yml` runs MySQL 8 with a named volume and
  healthcheck. A single npm script (e.g. `npm run dev`) brings up MySQL,
  applies migrations, and starts `api` + `web` dev servers (`nx run-many`).
  Angular dev server (4200) proxies `/api` to 3000.
- **Why:** matches ADR-0005 (local + prod only); containerizing the app
  locally would slow the edit loop for nothing. The production container is
  still exercised — building/running the Docker image is part of this
  slice's verification.
- **Config:** `.env.example` checked in (`DATABASE_URL`, `PORT`, static-root
  override); real `.env` gitignored (NFR-SEC-04).

### D6. Docker image: multi-stage, migrations on startup

- **What:** multi-stage `Dockerfile` — build stage (install deps, generate
  Prisma client, `nx build api web`), runtime stage (`node:*-slim`,
  production deps + dist + prisma schema/migrations). Container entrypoint
  runs `prisma migrate deploy` then starts the server.
- **Why:** TC-OPS-01 fixes Docker-on-Railway; migrate-on-start is safe with
  the single-instance constraint (TC-MEDIA-01/ADR-0003) and removes a manual
  deploy step — a slice landing on `main` is deployable without hand-run
  migrations.

### D7. Railway: app service + MySQL + Volume, backups on

- **What:** Railway project with the app service (built from the Dockerfile,
  healthcheck `/api/health`), managed MySQL, and a Volume mounted for future
  attachments (path via env, ADR-0003). `DATABASE_URL` and friends set as
  Railway env vars. Daily DB backups enabled on the MySQL service
  (NFR-REL-01).
- **Why:** provisioning the Volume now costs nothing and keeps S-07 free of
  infra work; backups are a checkbox best flipped before real data exists.

## Risks / Trade-offs

- [MySQL 8 `caching_sha2_password` + plain TCP: first-time auth needs RSA key
  retrieval; after a DB restart clears the server auth cache the pool can
  never reconnect (verified live)] → PrismaService builds an explicit pool
  config with `allowPublicKeyRetrieval: true` instead of passing the raw URL;
  acceptable without TLS on localhost / Railway private network (POC).
- [Empty baseline migration confuses future contributors] → README note in
  `api/prisma/` + S-02 adds real models immediately.
- [Migrate-on-start could crash-loop on a bad migration] → single instance,
  empty baseline in S-01; Railway keeps the previous deployment until the
  new one is healthy.
- [serve-static fallback can mask API 404s] → `/api` prefix explicitly
  excluded; e2e asserts unknown `/api/*` returns JSON 404, not index.html.
- [Railway specifics (volume, backups) are click-ops, not code] → captured as
  demo checks in the traceability matrix; env var names documented in
  `.env.example`.

## Migration Plan

Greenfield — nothing to migrate. Deploy order: land slice on `main` → build
image → Railway deploy → healthcheck gate. Rollback = redeploy previous image
(no schema changes in this slice).

## Open Questions

- None blocking. В-04 (design-check step in `verify`) becomes actionable once
  В-01 is closed here — left to the process track, not this slice.
