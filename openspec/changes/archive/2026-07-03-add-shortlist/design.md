## Context

The season continues after recommendations: applicants save a shortlist and track each
application through five stages. List and statuses persist via `state-persistence`;
empty list guides users to save from recommendations (FR-UX-01).

## Goals / Non-Goals

**Goals:**
- `SavedList` view of saved programs with ★ toggle entry points on cards/modal.
- Per-item status badge cycling Збережено → … → Зараховано → back to first.
- Monotonic `priority` ordering after remove-then-add.
- Empty `.pk-empty` hint pointing at ★ save action.

**Non-Goals:**
- Deadline reminders per saved item (FR-LIST-03 is Phase 3).
- Backend notifications or document upload.

## Decisions

### D1 — Status progression in `app/lib/status.ts`
`nextStatus` and `STATUSES` are pure; UI only calls `advanceStatus` on click.

### D2 — Badge uses modifier class + Ukrainian label
Status color pairs with text (NFR-A11Y-01); not color-only.

### D3 — Unique priority on re-save
Re-adding a removed program gets a new priority above existing entries.

## Risks / Trade-offs

- **Stale hardcoded deadline banners** → removed; shell `DeadlineBanner` is the single source.
- **Priority collisions** → store assigns `max(priority)+1` on save.
