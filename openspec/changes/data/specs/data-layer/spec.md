## ADDED Requirements

### Requirement: Core schema and enums
The system SHALL define a Prisma schema for the core five tables — `users`, `food_database`,
`food_log`, `body_metrics`, `reviews` — per requirements §6, with enums for `per`
(`100g`/`100ml`/`portion`/`piece`/`dish`), `meal`, `source` (`fact`/`estimate`), and `period`
(`daily`/`weekly`/`monthly`). Enum values and column names SHALL stay English (invariant #6).
Stored nutrition/measurement numbers SHALL use **integer** for kcal and Prisma **`Decimal`** for
gram and centimetre values — **never `Float`** (backend-conventions rule 10).

#### Scenario: Schema models the five core tables
- **WHEN** the Prisma schema is generated
- **THEN** models exist for `users`, `food_database`, `food_log`, `body_metrics`, `reviews` with the
  §6 columns, and no `Float` type is used for any stored kcal/gram/cm value

#### Scenario: source is a constrained enum
- **WHEN** a `food_log` row is created
- **THEN** its `source` column accepts only `fact` or `estimate` (a DB-level enum), keeping the
  fact/estimate tagging invariant structurally enforceable

### Requirement: Multi-tenancy by user_id
Every domain row SHALL carry a `user_id`, and `users` SHALL be keyed on the Telegram `chat_id`
(unique — the chat is the auth, no passwords). A service-layer helper SHALL scope every domain
query by `user_id` so the tenant filter cannot be omitted; there SHALL be no cross-tenant read.
(`food_database` rows MAY have a null `user_id` meaning a global catalog entry.)

#### Scenario: A query is scoped to one tenant
- **WHEN** a domain read/write goes through the tenancy helper with a given `user_id`
- **THEN** the resulting Prisma `where` includes that `user_id`, and rows of other users are never
  returned or mutated

#### Scenario: chat_id uniquely identifies a user
- **WHEN** a user is looked up by Telegram `chat_id`
- **THEN** at most one `users` row matches (a unique constraint on `chat_id`)

#### Scenario: Global catalog entry has null user_id
- **WHEN** a `food_database` row is a shared/global entry
- **THEN** its `user_id` is null and it is visible to all users, while a user-scoped entry carries
  that user's `user_id`

### Requirement: Pooled client sized to the host
The application SHALL expose a single pooled `PrismaClient` instance, reused across the process, with
a connection pool that respects the host's Postgres limit (`max_connections=20`, container 256 MB).
The bot SHALL NOT open a new client per request.

#### Scenario: One shared client
- **WHEN** application modules import the DB client
- **THEN** they receive the same singleton instance (no per-call client construction), keeping the
  pool within `max_connections`

### Requirement: Migrations apply off-box at container start
Schema changes SHALL go through Prisma migrations committed to the repo. Production SHALL apply them
with `prisma migrate deploy` at **container startup**, never with `migrate dev`, `db push`, or
`tsc`/`npm install` on the production host (invariant #7).

#### Scenario: Migration SQL is committed
- **WHEN** the schema changes
- **THEN** a generated migration under `prisma/migrations/` is committed alongside `schema.prisma`
  (no hand-edited ad-hoc SQL, no `db push` to prod)

#### Scenario: Prod applies migrations at start, not on host
- **WHEN** the container starts in production
- **THEN** `prisma migrate deploy` runs inside the container before the bot serves traffic, and no
  migration/build command runs on the host

### Requirement: Sensitive data stays private
No secret SHALL be stored in the database (secrets live in env only). Body and progress values SHALL
NOT be written to logs as raw values (invariant #9).

#### Scenario: No secret column
- **WHEN** the schema is reviewed
- **THEN** no table stores a token/password/API key; such values remain environment-only

#### Scenario: Body metrics are not logged raw
- **WHEN** a `body_metrics` row is written or read
- **THEN** the code path does not log the raw weight/measurement values
