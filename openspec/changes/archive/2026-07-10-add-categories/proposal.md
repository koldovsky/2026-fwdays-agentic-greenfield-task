## Why

Cadence is organized around user-defined categories: every tracked session belongs to a category,
and the heatmap, metrics, and coach all slice time by category. Before any of that can exist, a user
must be able to create, rename, recolor, and remove their own categories. This change adds that
capability — categories CRUD — on top of the slice 001 authentication boundary, so a category is
strictly per-user and reachable only by its owner.

Unlike slice 001 (recorded **retroactively**), this change is authored **before any code**: it is the
ratified OpenSpec contract the implementation will be built against (spec-first, per
[`openspec/README.md`](../../README.md)).

## What Changes

- Add category creation (`POST /api/categories`): a name, a color, and an optional description, kept as a flat list with no nesting; a duplicate **active** name for the same user is rejected. **FR-CAT-01**
- Add category editing (`PATCH /api/categories/{id}`): update the name, color, and description; renaming onto another of the user's **active** category names is rejected. **FR-CAT-02**
- Add category deletion (`DELETE /api/categories/{id}`) as **archive** (soft-delete) per the O-4 decision (architecture §7): a category referenced by sessions is archived (its `archived_at` is set) so history and metrics are preserved and it drops out of the active list that pickers consume; a category with no sessions may be hard-deleted. **FR-CAT-03**
- Add the read surface the Categories screen needs (`GET /api/categories`): list the current user's **active** (non-archived) categories. This is the R in CRUD, not a new requirement.
- Enforce per-user isolation on every category operation through the slice 001 `CurrentUser` dependency and the user_id-scoped repository pattern — a user can create, read, edit, and delete only their own categories; another user's category is invisible (404). Reuses **FR-AUTH-07** (not re-implemented here).
- Out of scope (not in this change): the timer, sessions, heatmap, metrics, stats, and coach — everything that *consumes* categories (later slices); unarchive (a trivial future add); and the per-card stats (total time, session count) of DESIGN §7.4, which depend on the sessions slice.

## Capabilities

### New Capabilities
- `categories`: per-user CRUD of time-tracking categories (name, color, description) with delete-as-archive so a history-referenced category is never destroyed.

### Modified Capabilities
<!-- None: `categories` is a new capability. It reuses the `auth` capability's CurrentUser dependency and user_id-scoped repository pattern (FR-AUTH-07) without modifying it. -->

## Impact

- **Requirements** (authoritative text in [`docs/requirements.md`](../../../docs/requirements.md)): FR-CAT-01, FR-CAT-02, FR-CAT-03; reuses FR-AUTH-07 (per-user isolation).
- **Endpoints:** `GET`/`POST` `/api/categories` and `PATCH`/`DELETE` `/api/categories/{id}` (architecture §10), all behind `CurrentUser`.
- **Backend / migration:** one Alembic migration `0002_categories` creating the `categories` table per architecture §2.1 — `user_id` FK, `name`, `color` (hex), `description` nullable, `archived_at`, plus the partial unique index `UNIQUE(user_id, name) WHERE archived_at IS NULL`; a user_id-scoped `CategoryRepo` in `app/repos/`; `app/api/categories.py` with its Pydantic request/response models.
- **Frontend:** the Categories screen (DESIGN §7.4) — a responsive 3-column grid of category cards with a color swatch header, a "+ New category" form using a native color input, and hover edit/delete; all HTTP through `src/api.ts`.
- **Tests:** `backend/tests/test_categories.py` — create (happy · per-user · duplicate), edit (happy · duplicate-rename · cross-user), delete-as-archive · hard-delete · archived-excluded-from-list, against real Postgres.
- **Docs:** the thin anchor [`docs/specs/002-categories.md`](../../../docs/specs/002-categories.md) links to this change for the Python traceability harness (specs<->OpenSpec bridge, `openspec/README.md`).
