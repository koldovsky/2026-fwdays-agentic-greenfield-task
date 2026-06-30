## ADDED Requirements

### Requirement: Database migration and connectivity on startup
On boot, after env validation and before the bot begins serving updates, the runtime SHALL apply
pending Prisma migrations (`prisma migrate deploy`, run inside the container) and confirm a working
database connection. If migrations fail or the database is unreachable, the process SHALL exit
non-zero rather than serve traffic against an unmigrated or absent database.

#### Scenario: Migrations applied before serving
- **WHEN** the container starts in production
- **THEN** `prisma migrate deploy` runs and completes successfully before `bot.start()` is called

#### Scenario: Unreachable database aborts boot
- **WHEN** the bot starts and the database connection cannot be established
- **THEN** the process logs the failure and exits non-zero without entering the long-poll loop
