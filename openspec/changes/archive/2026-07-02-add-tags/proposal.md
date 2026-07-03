## Why

Entries are free-text only. Tags are the MVP's lightweight grouping (the stand-in for
projects/clients, which are deferred): the user labels entries and filters history by
them. Tags also unblock the per-tag breakdown in `profile-stats` later.

## What Changes

- **Shared (`@honeydo/shared`)** — a `Tag` contract (`id`, `userId`, `name`, `color`);
  `TimeEntry` gains a `tags: Tag[]` field; create/manual/update entry payloads accept an
  optional `tagIds: string[]`. A pure `filterEntriesByTags` helper (unit-tested) for the
  History filter (FR-TAG-04).
- **API (`@honeydo/api`)** — a `tags` module: user-scoped tag CRUD (create, list, rename,
  delete) with a unique name per user. A `Tag` Prisma model and an implicit many-to-many
  with `TimeEntry`. Deleting a tag **detaches** it from entries and never deletes entries
  (FR-TAG-03). Entry create/manual/update/continue set the entry's tags from `tagIds`;
  every entry response includes its `tags`.
- **Mobile (`@honeydo/mobile`)** — tag create + assign UI in the entry form (a tag picker,
  create-on-the-fly), colored tag dots on entry rows (already in the `TimerEntry`
  reference), the **filter chip row** on History (filter by one or more tags, client-side
  over the fetched entries), and a **Manage Tags** screen reached from the Profile
  "Manage tags" row (list, rename, recolor, delete) — per the Profile design reference. A
  small tags query/store.
- **Continue now copies tags** (FR-ENTRY-08): the earlier `time-entries` spec hedged
  "once tags exist" — this change makes continue copy the source entry's tags.

## Capabilities

### New Capabilities
- `tags`: user-defined tags (name + optional color), assigning zero-or-more to an entry,
  rename/delete with detach-not-cascade, and filtering history by tags. FR-TAG-01→04.

### Modified Capabilities
- `time-entries`: the **Continue** requirement now copies the source entry's **tags** (not
  just its description), and entry responses carry their assigned tags. (FR-ENTRY-08)

## Impact

- **Contracts:** new `Tag` in `packages/shared/src/contracts.ts`; `TimeEntry.tags`;
  `tagIds?` on `CreateTimeEntry`/`ManualTimeEntry`/`UpdateTimeEntry`; new
  `packages/shared/src/tags.ts` (`filterEntriesByTags`) + tests.
- **Database:** `apps/api/prisma/schema.prisma` — `Tag` model (userId, name, color,
  `@@unique([userId, name])`) and an implicit m-to-n relation to `TimeEntry`; migration.
- **API:** new `apps/api/src/tags/` module; `time-entries` service/DTOs updated to accept
  `tagIds` and to `include: { tags: true }` on every entry read/write; continue copies tags.
- **Mobile:** tag picker + create in `EntryFormModal`, tag dots on `TimerEntry`, a
  `FilterChips` row + filter state on `HistoryScreen`, a **Manage Tags** screen + a Profile
  stack so the "Manage tags" row can push to it, a `useTags` hook/query.
- **Out of scope (deferred):** per-tag time analytics (`profile-stats`); projects/clients.
  Server-side tag filtering (History filters client-side over already-fetched entries).
