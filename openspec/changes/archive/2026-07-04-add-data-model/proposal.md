## Why

Notely has a UI shell but no persistence layer. Every downstream capability
(auth, notes CRUD, folders/tags, search) needs a stable, migratable schema
for users, notes, folders, and tags before it can store or query real data.

## What Changes

- Add Prisma schema with `User`, `Note`, `Folder`, `Tag`, and `NoteTag` models
- Configure PostgreSQL as the datasource and wire up the Prisma client
- Add initial migration and a seed script for local development
- Enforce ownership: every note belongs to exactly one user (`DATA-001`)
- Support optional one-to-one note→folder relation (`DATA-002`)
- Support many-to-many note↔tag relation via join table (`DATA-003`)
- Add `deletedAt` soft-delete field on `Note` plus a purge mechanism
  (scheduled job or query filter) that removes notes 30 days after
  soft-delete (`DATA-004`)

## Capabilities

### New Capabilities
- `data-model`: Prisma schema, migrations, and data lifecycle rules for
  users, notes, folders, and tags, including soft-delete retention.

### Modified Capabilities
(none — `app-foundation` requirements are unaffected)

## Impact

- New `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`
- New `lib/prisma.ts` (or equivalent) Prisma client singleton
- New dependency: `@prisma/client`, `prisma` (dev)
- Requires a PostgreSQL connection string (`DATABASE_URL` env var)
- No UI-visible change yet; unblocks `add-auth` and `add-notes-core`
