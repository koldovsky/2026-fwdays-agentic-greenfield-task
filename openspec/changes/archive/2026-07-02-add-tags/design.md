## Context

The time-entries core loop is live. Tags add a user-defined labeling layer on top and a
History filter. The design system already anticipates tags: the `TimerEntry` reference
renders a colored dot + tag name, and the History reference has a `FilterChip` row. This
change wires that up. It reuses the JWT guard and the existing TanStack Query cache.

Constraints:
- **FR-TAG-03** — deleting a tag must **detach**, never cascade to entries.
- **BC-SCOPE-01 / FR-AUTH-06** — tags are user-scoped behind the guard.
- **TC-PURE-01** — the history filter predicate is a pure, unit-tested helper.
- Grouping already happens client-side over the full entry list, so tag **filtering**
  fits there too (no new server query).

## Goals / Non-Goals

**Goals:**
- Tag CRUD (create/list/rename/delete), unique name per user, detach-on-delete.
- Assign tags to entries on create/manual/edit/continue; entries carry their tags.
- History filter by one or more tags; colored tag dots on rows.

**Non-Goals:**
- Per-tag time analytics (belongs to `profile-stats`).
- Projects/clients.
- Server-side tag filtering / pagination (client-side filter over fetched entries).

## Decisions

### 1. Implicit many-to-many (Prisma) between `TimeEntry` and `Tag`

Use Prisma's implicit m-to-n (`tags Tag[]` / `entries TimeEntry[]`) so Prisma manages the
join table. Deleting a `Tag` removes its join rows only — entries are untouched
(satisfies FR-TAG-03 without any cascade to `TimeEntry`). *Alternative:* an explicit join
model — unnecessary now (no join metadata); revisit if we ever tag with attributes.

### 2. Entries always include their tags; assignment via `tagIds`

Every entry read/write does `include: { tags: true }`, and `TimeEntry.tags: Tag[]` is part
of the contract, so the mobile row can render dots and the filter can run without extra
fetches. Writes accept `tagIds?: string[]`; the service `set`s the relation to exactly
those ids (after checking they belong to the user). Omitting `tagIds` on update leaves
tags unchanged; passing `[]` clears them. *Alternative:* separate attach/detach endpoints
— more round-trips; `set` semantics match the edit form's "these are the tags now."

### 3. History filter is pure + client-side

`filterEntriesByTags(entries, selectedTagIds)` in `packages/shared` (framework-free,
unit-tested): returns entries whose tag set intersects the selection; empty selection →
all. Runs in the History screen over the already-fetched list, consistent with the
client-side day grouping. *Alternative:* a server `?tagIds=` query — deferred; no benefit
at MVP scale.

### 4. Color is an optional token-ish hex string

`Tag.color` is a nullable string holding a hex value chosen from a small preset palette in
the picker (the design uses amber/green/blue/purple/…). Stored as-is; the mobile maps it
to a dot color. Null color → a neutral dot. Keeping it a free hex (not an enum) avoids a
migration when the palette grows. *Note:* these are data values, not theme tokens, so they
live in the DB, not `tokens.ts`.

### 5. Tag CRUD state via TanStack Query

A `useTags` query (`['tags']`) plus create/rename/delete mutations that invalidate it and
the entries key (since entries embed tags). The entry form's tag picker reads `useTags` and
can create a tag inline (optimistic add, then invalidate).

### 6. Manage Tags is a pushed screen under a Profile stack

The Profile tab currently renders `ProfileScreen` directly. To support the design's
"Manage tags" row (a settings row with a chevron → push), wrap the Profile tab in a small
native-stack (`ProfileScreen` → `ManageTagsScreen`). The Manage Tags screen lists the
user's tags with a colored dot and offers rename, recolor, delete (delete detaches per
FR-TAG-03) and create — reusing the same `useTags` mutations as the inline picker.
*Alternative:* present Manage Tags as a full-screen modal from Profile — simpler but loses
the native push/back the design implies; a stack is the right call and is cheap for one
extra screen.

## Risks / Trade-offs

- **Deleting a tag mid-edit** → the entries query is invalidated on tag delete so rows drop
  the tag; open forms re-read on next open (form resets on open already).
- **Unique-name race** → the `@@unique([userId, name])` constraint is the backstop; the
  service maps the Prisma unique error to a 409/400.
- **Case-insensitive uniqueness** → enforce by comparing normalized (lower-cased, trimmed)
  names in the service; the DB unique index is exact-case as a backstop.
- **`set` on update requires ownership check** → the service filters `tagIds` to the user's
  own tags before `set`, so a foreign id can't be attached.

## Migration Plan

1. `schema.prisma`: add `Tag` (userId, name, color?, `@@unique([userId, name])`,
   `@@index([userId]`), implicit relation to `TimeEntry`; `npm run migrate` (dev).
2. Shared contracts + pure `filterEntriesByTags` (test-first); build shared.
3. API tags module + entry service/DTO updates (`tagIds`, `include tags`, continue copies
   tags); tests for detach-on-delete, uniqueness, cross-user, continue-copies-tags.
4. Mobile: `useTags`, tag picker in the entry form, dots on rows, History filter chips,
   the Profile stack + Manage Tags screen.
Rollback: revert migration + module; entries keep working (tags are additive).

## Open Questions

- None outstanding. Tag management ships **both** ways: inline create in the entry-form
  picker (fastest assignment path) and a dedicated **Manage Tags** screen from Profile
  (list/rename/recolor/delete), matching the Profile design reference.
