## 1. Setup

- [x] 1.1 Add `prisma` (dev) and `@prisma/client` dependencies
- [x] 1.2 Run `prisma init` (or hand-create) `prisma/schema.prisma` with PostgreSQL datasource
- [x] 1.3 Add `DATABASE_URL` to `.env.example` and local `.env`

## 2. Schema

- [x] 2.1 Define `User` model (id, email, password hash placeholder field, timestamps)
- [x] 2.2 Define `Folder` model with required `userId` relation
- [x] 2.3 Define `Tag` model with required `userId` relation
- [x] 2.4 Define `Note` model: required `userId`, optional `folderId` (`onDelete: SetNull`), `title`, `content`, `color`, `isFavorite`, `isPinned`, `deletedAt`, `createdAt`, `updatedAt`
- [x] 2.5 Define `NoteTag` join model linking `Note` and `Tag` (composite unique on `noteId`+`tagId`)
- [x] 2.6 Add indexes: `Note.userId`, `Note.folderId`, `Note.deletedAt`, `NoteTag.tagId`

## 3. Migration and client

- [x] 3.1 Run `prisma migrate dev --name init` to generate and apply the first migration
- [x] 3.2 Add `lib/prisma.ts` Prisma client singleton (hot-reload safe for Next.js dev)
- [x] 3.3 Verify `prisma generate` runs as part of `postinstall` or build script

## 4. Seed data

- [x] 4.1 Write `prisma/seed.ts` creating a demo user, folder, a few tags, and notes (including one soft-deleted note)
- [x] 4.2 Wire `prisma.seed` entry in `package.json`
- [x] 4.3 Run seed script locally and confirm rows exist via `prisma studio` or a query

## 5. Soft-delete retention (DATA-004)

- [x] 5.1 Add `lib/notes/purge.ts` exporting a function that deletes notes where `deletedAt` is older than 30 days
- [x] 5.2 Add default query helper/scope that excludes notes with non-null `deletedAt` from standard note queries
- [x] 5.3 Add a trash-query helper that returns only notes with non-null `deletedAt`
- [x] 5.4 Document how to invoke the purge routine on a schedule (cron/platform job) in code comments or README

## 6. Verification

- [x] 6.1 Write a script or test exercising: note creation with owner, folder assignment/removal, tag assignment/removal, soft-delete, and purge cutoff behavior
- [x] 6.2 Confirm deleting a folder does not delete its notes (`folderId` becomes null)
- [x] 6.3 Confirm deleting a tag removes `NoteTag` rows but leaves notes intact
- [x] 6.4 Run `prisma validate` and `prisma migrate status` to confirm schema and migration consistency
