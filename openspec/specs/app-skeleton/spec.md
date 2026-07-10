# app-skeleton Specification

## Purpose

TBD - created by archiving change s01-walking-skeleton. Update Purpose after archive.

## Requirements

### Requirement: Health endpoint reports app and DB liveness

The API SHALL expose `GET /api/health` (NFR-OBS-01, health part). When the
application is running and MySQL is reachable, it SHALL respond `200` with a
JSON body containing `status: "ok"` and `db: "up"`. When MySQL is not
reachable, it SHALL respond `503` with `status: "error"` and `db: "down"`.
The production platform healthcheck SHALL target this endpoint.

#### Scenario: Healthy app with live DB

- **WHEN** `GET /api/health` is requested while the app is running and MySQL is reachable
- **THEN** the response is `200` with JSON `status: "ok"` and `db: "up"`

#### Scenario: DB is unreachable

- **WHEN** `GET /api/health` is requested while MySQL is down
- **THEN** the response is `503` with JSON `status: "error"` and `db: "down"`

### Requirement: Single process serves both SPA and API

The NestJS process SHALL serve the built SPA static files itself — one
service, one container, no reverse proxy (TC-STACK-02, ADR-0002). Requests
outside the `/api` prefix SHALL fall back to the SPA `index.html` (client-side
routing); unknown `/api/*` paths SHALL return a JSON 404 from the API, never
the SPA page.

#### Scenario: SPA is served from the app origin

- **WHEN** a browser opens the app root URL in production mode
- **THEN** the SPA hello page renders, served by the NestJS process

#### Scenario: Deep link falls back to the SPA

- **WHEN** a non-`/api` path with no matching static file is requested
- **THEN** the response is `200` with the SPA `index.html`

#### Scenario: Unknown API route stays a JSON 404

- **WHEN** `GET /api/does-not-exist` is requested
- **THEN** the response is `404` with a JSON error body, not `index.html`

### Requirement: Database access goes through Prisma with versioned migrations

The API SHALL use Prisma as the data access layer over MySQL (TC-STACK-01).
The schema SHALL live in the api project with a versioned baseline migration,
and pending migrations SHALL be applied automatically on production container
startup before the server accepts traffic.

#### Scenario: Baseline migration applies on a clean database

- **WHEN** the app starts against an empty MySQL database
- **THEN** `prisma migrate deploy` applies the baseline migration and the `_prisma_migrations` table records it

#### Scenario: Migrations are idempotent on restart

- **WHEN** the app restarts against an already-migrated database
- **THEN** no migration is re-applied and the app starts normally

### Requirement: One-command local start

A single documented command SHALL, on a clean clone with documented
prerequisites (Node, Docker), start local MySQL, apply migrations, and serve
the app: SPA on `http://localhost:4200`, API on `http://localhost:3000/api`,
with the dev SPA proxying `/api` calls to the API.

#### Scenario: Clean clone starts with one command

- **WHEN** a developer runs the documented start command on a clean clone
- **THEN** the SPA opens on 4200, and `GET /api/health` returns `200` with `db: "up"`

### Requirement: Production deploy is a Docker image configured only by env vars

The app SHALL be deployed to production as a single multi-stage Docker image
on Railway (TC-OPS-01) with managed MySQL and an attachments Volume
provisioned. All configuration and secrets (`DATABASE_URL`, port, paths)
SHALL come exclusively from environment variables; the repository SHALL
contain no secrets, only a committed `.env.example` (NFR-SEC-04). Daily
database backups SHALL be enabled on the production MySQL service
(NFR-REL-01).

#### Scenario: Production URL serves the skeleton

- **WHEN** the production Railway URL is opened after a deploy
- **THEN** the SPA renders and `GET /api/health` returns `200` with `db: "up"`

#### Scenario: No secrets in the repository

- **WHEN** the repository is scanned for credentials
- **THEN** only `.env.example` with placeholder values is present; real values exist only as Railway env vars

#### Scenario: Production DB backups are enabled

- **WHEN** the Railway MySQL service settings are inspected
- **THEN** daily backups are enabled
