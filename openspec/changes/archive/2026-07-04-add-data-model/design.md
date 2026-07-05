## Context

Notely's app shell (`add-app-foundation`) is built but nothing persists yet.
The PRD (`docs/PRD.md`) specifies Prisma + PostgreSQL, and note fields:
title, content (markdown), folderId, tags[], color, isFavorite, isPinned,
deletedAt, createdAt, updatedAt. `docs/requirements.md` (DATA-001..004)
constrains the relational shape: one owner per note, optional folder,
many tags, and a 30-day soft-delete retention window. This change defines
the schema every later capability (auth, notes-core, folders-tags, search)
builds on.

## Goals / Non-Goals

**Goals:**
- Define a Prisma schema for `User`, `Note`, `Folder`, `Tag`, `NoteTag`
- Encode DATA-001–004 as schema constraints, not just application logic
- Provide a migration and seed script so later changes have data to build against
- Provide a mechanism to permanently purge notes 30 days after soft-delete

**Non-Goals:**
- Authentication/session logic (`add-auth`)
- Note CRUD UI or server actions (`add-notes-core`)
- Full-text search indexes (`add-search` — may extend `Note` later)
- Folder/tag CRUD UI (`add-folders-tags`)

## Decisions

**Schema fields on `Note` beyond the traced DATA IDs** (`title`, `content`,
`color`, `isFavorite`, `isPinned`, `createdAt`, `updatedAt`) are included now
per the PRD's note field list, since altering the shape of `Note` later is a
migration, not a config change. Only the relational/lifecycle behavior
(ownership, folder, tags, retention) is asserted as a spec requirement here;
the extra columns are implementation detail owned by this design, not new
requirement IDs.

- **User → Note: one-to-many, required.** `Note.userId` is a required
  foreign key (`DATA-001`). Alternative considered: nullable owner for
  "anonymous" notes — rejected, out of scope per requirements.
- **Note → Folder: optional many-to-one.** `Note.folderId` is nullable;
  deleting a folder sets `folderId` to null (`onDelete: SetNull`) rather
  than cascading note deletion, so folder removal never destroys notes
  (`DATA-002`).
- **Note ↔ Tag: many-to-many via explicit `NoteTag` join table.** Chosen
  over Prisma's implicit m-n so we can add fields (e.g. `createdAt`) later
  without a schema migration shape change (`DATA-003`).
- **Soft delete via nullable `Note.deletedAt`.** Application queries
  default to `deletedAt: null`; a "Trash" view queries `deletedAt: not null`.
  Chosen over a separate `DeletedNote` table to keep note restore trivial
  (`DATA-004`).
- **Purge mechanism: lazy query filter + scheduled job stub.** A Prisma
  `deleteMany({ where: { deletedAt: { lt: now - 30d } } })` helper is added
  and exposed for a scheduler (cron or platform job) to call. No scheduler
  infrastructure exists yet, so this change ships the query and a
  documented manual/cron invocation path rather than standing up a job
  runner — full automation can be revisited in `add-quality-hardening` or
  a dedicated ops change if needed.
- **IDs: `cuid()`.** Consistent with Prisma defaults, avoids exposing
  sequential integer IDs.

## Risks / Trade-offs

- [Risk] No scheduler wired up yet, so 30-day purge won't run
  automatically until something invokes it → Mitigation: ship the purge
  query as a reusable function (`lib/notes/purge.ts`) and document how to
  wire it to a cron/scheduled job when the hosting platform is chosen;
  soft-delete filtering in queries still hides trashed notes older than
  30 days from normal use even if physical purge lags.
- [Risk] Explicit join table adds query verbosity vs. implicit m-n →
  Mitigation: wrap common tag queries in a small `lib/notes/tags.ts` helper
  used by later changes.
- [Risk] Adding PRD-only fields (`color`, `isFavorite`, `isPinned`) without
  a traced requirement ID could drift from requirements.md → Mitigation:
  documented above as implementation detail; no behavior is asserted for
  them in specs/data-model/spec.md.

## Migration Plan

1. Add `prisma`, `@prisma/client` dependencies.
2. Write `prisma/schema.prisma` with the models above.
3. Run `prisma migrate dev --name init` to generate the first migration.
4. Add `prisma/seed.ts` with a demo user, folder, tags, and notes; wire to
   `package.json` `prisma.seed`.
5. Add `lib/prisma.ts` client singleton (Next.js dev hot-reload safe).
6. No rollback concern — this is the first migration in a fresh database.

## Open Questions

- Which host/service will run the scheduled purge job (Vercel Cron,
  external cron, etc.)? Deferred until deployment target is chosen.
