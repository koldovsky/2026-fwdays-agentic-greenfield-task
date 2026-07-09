## ADDED Requirements

### Requirement: Local dev services via Docker Compose
The system SHALL provide a `docker-compose.yml` at the repo root that starts
PostgreSQL 16 and Redis 7 for local development with one command, with images
version-pinned (no `latest`), all ports bound to `127.0.0.1` only, and
Postgres data on a named volume so it survives container restarts.
Implements TC-STACK-04, TC-STACK-05.

#### Scenario: One-command startup
- **WHEN** a developer runs `docker compose up` in the repo root
- **THEN** Postgres accepts connections on `127.0.0.1:5432` and Redis on `127.0.0.1:6379`, and restarting the containers preserves Postgres data

#### Scenario: No external exposure
- **WHEN** the compose services are running
- **THEN** neither Postgres nor Redis listens on a non-loopback interface, and every image reference in `docker-compose.yml` carries an explicit version tag

### Requirement: Dev-only credentials, clearly bounded
The compose file SHALL use development-only credentials that are named as such,
are valid only for the localhost-bound services, and are never reused in any
deployed environment; no production secret SHALL appear in the repository.
Implements TC-STACK-05.

#### Scenario: Credentials are dev-scoped
- **WHEN** the compose file is inspected
- **THEN** database credentials are identifiably dev-only (e.g. a `_dev` suffix) and documentation states they must never be used outside local development

### Requirement: Zero-install pglite path preserved
The system SHALL keep the pglite dev database (`yarn dev:db`) working as the
zero-install default, applying the same forward-only migrations from
`src/shared/lib/db/migrations` as the compose Postgres, so a contributor
without Docker can run every DB-backed flow.
Implements TC-STACK-05.

#### Scenario: No Docker installed
- **WHEN** a contributor without Docker runs `yarn dev:db` and points `DATABASE_URL` at `127.0.0.1:5544`
- **THEN** registration, sign-in, and persistence flows work identically to the compose-backed setup

#### Scenario: Single migrations source
- **WHEN** migrations are applied against the compose Postgres and against pglite
- **THEN** both produce the same schema from the same `src/shared/lib/db/migrations` files, with forward-only semantics

### Requirement: Queue worker ships as a hardened container image
The queue worker SHALL be packaged, once it graduates from the inline MVP to
BullMQ per `add-agent-loop`, as a Docker image built with a multi-stage build
that runs as a non-root user, contains only production dependencies, and bakes
in no secrets; all configuration SHALL arrive via runtime environment
variables. Implements TC-STACK-04.

#### Scenario: Image is non-root and secret-free
- **WHEN** the worker image is built and inspected
- **THEN** the runtime user is not root, no `.env*` file or secret value is present in any image layer, and the worker fails fast with a clear error when a required environment variable is missing at startup

### Requirement: Web app is not containerized
The Next.js web app SHALL continue to deploy via the Vercel git integration
and SHALL NOT gain a Dockerfile; the containerization boundary is: backing
services and the queue worker in containers, the web app on Vercel.
Implements TC-DEPLOY-01.

#### Scenario: Deploy boundary holds
- **WHEN** deployment artifacts are reviewed
- **THEN** no web-app Dockerfile exists and the web app's deploy path remains the Vercel git integration
