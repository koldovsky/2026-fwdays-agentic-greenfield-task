# Tasks: S-01 · Walking Skeleton and Production Deploy

## 1. Decisions and dependencies

- [x] 1.1 Write ADR: UI kit = Angular Material v21 (design D1); add its row to
      `docs/adr/README.md`; mark В-01 closed in
      `docs/assumptions-open-questions.md` (annotate `✅ → ADR`)
- [x] 1.2 Install dependencies: `@angular/material` + CDK (web), `prisma`,
      `@prisma/client`, `@nestjs/serve-static` (api)

## 2. Database layer (Prisma + MySQL)

- [x] 2.1 Add `docker-compose.yml` with MySQL 8 (named volume, healthcheck)
      and `.env.example` (`DATABASE_URL`, `PORT`, static-root override);
      ensure `.env` is gitignored
- [x] 2.2 Create `api/prisma/schema.prisma` (MySQL datasource, client
      generator, no models) + empty baseline migration `0_init` via
      `prisma migrate dev --create-only`; add a short README note explaining
      the empty baseline (design D2)
- [x] 2.3 Implement `PrismaService`/`PrismaModule` in `api/` (connect on
      init, disconnect on shutdown) and register it in the app module

## 3. API: health endpoint

- [x] 3.1 Implement `HealthModule` with `GET /api/health`: `SELECT 1` via
      PrismaService → `200 {status:"ok",db:"up"}`; on failure →
      `503 {status:"error",db:"down"}` (design D3)
- [x] 3.2 Unit tests for the health controller (DB up / DB down paths)

## 4. Web: hello page on Angular Material

- [x] 4.1 Read `/web-conventions`; set up Angular Material (theme, typography)
      in `web/` per ADR-0009 (zoneless, OnPush, standalone)
- [x] 4.2 Replace scaffold hello-world with a minimal Ukrainian hello/landing
      page using Material components; show live `/api/health` status on it
- [x] 4.3 Configure dev-server proxy `/api` → `localhost:3000`; unit test for
      the page

## 5. Single container: statics + Docker

- [x] 5.1 Wire `ServeStaticModule` in `api/`: serve web build output, exclude
      `/api/*`, SPA `index.html` fallback; static root via env with default
      (design D4)
- [x] 5.2 Multi-stage `Dockerfile`: build (deps, prisma generate,
      `nx build api web`) → runtime (`node:*-slim`, prod deps, dist, prisma
      schema+migrations); entrypoint runs `prisma migrate deploy` then starts
      the server (design D6)
- [x] 5.3 Build and run the image locally against compose MySQL: SPA renders
      on :3000, `/api/health` green, unknown `/api/*` returns JSON 404
- [x] 5.4 Add the one-command local start script (`npm run dev`: MySQL up →
      migrate → `nx run-many serve api web`) and document it in README

## 6. Production deploy (Railway)

- [x] 6.1 Create Railway project: app service from Dockerfile, managed MySQL,
      Volume for future attachments; set env vars (`DATABASE_URL`, `PORT`,
      volume path); healthcheck path `/api/health` (design D7)
- [x] 6.2 Enable daily backups on the Railway MySQL service (NFR-REL-01)
- [x] 6.3 Deploy and verify on the prod URL: SPA renders, `/api/health` is
      `200` with `db:"up"`

## 7. Slice DoD (fixed order per openspec/config.yaml)

- [x] 7.1 All task checkboxes above are `[x]`
- [x] 7.2 `npm run verify` passes (format, lint, typecheck, fallow audit,
      openspec validate, tests, build)
- [x] 7.3 Smoke test on a real DB: baseline migration applies on a clean DB,
      re-start is idempotent, health flips to 503 when MySQL is stopped
- [x] 7.4 Playwright e2e (`web-e2e`) for the slice's critical paths: hello
      page renders and shows green health (from acceptance scenarios)
- [x] 7.5 Adversarial review by the `slice-reviewer` subagent (ADR-0010): one
      pass over the slice diff; fix critical/high findings and re-run verify;
      log medium/low dispositions for the retro
- [x] 7.6 Launch-and-look: run the app, walk the S-01 happy path (open SPA
      locally and on prod, check health), confirm it works
- [x] 7.7 Archive the change (`/opsx:archive`) and confirm
      `npx openspec list` is empty
- [x] 7.8 Update `docs/current-state.md` (phase, done, next, blockers) and
      `docs/traceability-matrix.md` (TC/NFR → spec → test → demo check)
- [x] 7.9 Session retrospective via `/slice-retro` → `docs/cycles/S-01.md`
