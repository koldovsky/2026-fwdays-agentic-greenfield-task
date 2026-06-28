# data-model

## Purpose

The Postgres schema (via Prisma) for all MVP entities and their relations, plus a single
shared Prisma client, generated and validated without requiring a live database
(TC-STACK-02, TC-STACK-04).

## Requirements

### Requirement: Prisma schema covers all MVP entities and relations

The system SHALL define the persistence model in `prisma/schema.prisma` using a
`postgresql` datasource, with a Prisma client generator, and the connection SHALL be
configured from server-side environment (`DATABASE_URL`) rather than hard-coded. The schema
SHALL include a model for each MVP glossary entity — Employee,
Template, Question, Cycle, Response, Answer, Dialog, Summary, and UsageRow — with the
relations between them, and SHALL constrain closed value sets with database enums for
question type (`scale` | `open`), cycle status (`collecting` | `done` | `expired`),
respondent mode (`form` | `interview`), and usage purpose (`interview` | `summary`)
(TC-STACK-02, TC-STACK-04, FR-TPL-02, FR-CYCLE-04, FR-RESP-02, FR-USAGE-01).

#### Scenario: Schema validates without a database

- **WHEN** `prisma validate` is run against `prisma/schema.prisma`
- **THEN** it reports the schema valid without requiring a live database connection

#### Scenario: All glossary entities and enums are present

- **WHEN** the schema is read
- **THEN** it contains models named Employee, Template, Question, Cycle, Response, Answer,
  Dialog, Summary, and UsageRow, and enums for question type, cycle status, respondent
  mode, and usage purpose

#### Scenario: A launched cycle freezes its template

- **WHEN** the Cycle model is read
- **THEN** it carries a frozen snapshot of the template and questions (so later template
  changes never alter a launched cycle) and an unguessable respondent link token distinct
  from its id (FR-CYCLE-03, FR-LINK-02)

#### Scenario: A usage row can store a precomputed cost

- **WHEN** the UsageRow model is read
- **THEN** it records purpose, model id, input and output token counts, and a USD cost,
  tied to its cycle, so a recorded row keeps the price that applied when written
  (FR-USAGE-01, FR-USAGE-02)

### Requirement: Single shared, typed Prisma client

The system SHALL expose one shared Prisma client from `lib/db/` that all database access
goes through, reused across development hot reloads rather than instantiated per call. The
client SHALL be typed with Prisma's generated types and SHALL NOT use type assertions/casts
or `@ts-ignore` / `@ts-expect-error` (TC-STACK-04, TC-TS-01).

#### Scenario: Generated client and shared module type-check

- **WHEN** `prisma generate` has run and `tsc --noEmit` is run
- **THEN** the shared `lib/db/` module compiles using the generated Prisma types with no
  `any`, no casts, and no error-silencing comments

#### Scenario: No live migration in this slice

- **WHEN** this change is applied
- **THEN** the schema is generated and validated only; no `prisma migrate` / `db push` runs
  and no managed Postgres is provisioned

### Requirement: Documented database configuration

The system SHALL document the required database configuration via a `.env.example` file
containing a `DATABASE_URL` placeholder, so the connection string is supplied through
server-side environment configuration and never hard-coded (TC-DEPLOY-01, NFR-SEC-02).

#### Scenario: Env example documents the connection string

- **WHEN** `.env.example` is read
- **THEN** it contains a `DATABASE_URL` entry with a placeholder value and no real secret
