# Capability: tags

- **Order:** 05 · **Phase:** 3 · **OpenSpec change:** `add-tags` · **Status:** not started
- **Depends on:** time-entries · **Blocks:** profile-stats (per-tag breakdown)
- **Packages:** `packages/shared`, `apps/api`, `apps/mobile`

## Summary

Lightweight grouping: user-defined tags assigned to entries, used to filter history. Tags are
the MVP stand-in for projects/clients (which are deferred).

## Requirements

| ID | Description |
|----|-------------|
| FR-TAG-01 | Create a tag (name + optional color) |
| FR-TAG-02 | Assign zero or more tags to an entry |
| FR-TAG-03 | Rename or delete a tag; deleting detaches it from entries and never deletes entries |
| FR-TAG-04 | Filter the history list by one or more tags |

## Scope

- Shared: `Tag` contract; entry⇄tag relation in contracts.
- API: tags module + `Tag` model and many-to-many with `TimeEntry`; detach-on-delete semantics.
- Mobile: tag create/assign UI in the entry form; tag filter on the history list.

## Non-goals

No tag analytics here (per-tag time breakdown belongs to `profile-stats`). No projects/clients.

## Risks / notes

Deleting a tag must never cascade to entries (FR-TAG-03) — detach only.
