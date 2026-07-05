# OpenSpec capabilities and implementation order

This document splits [requirements.md](requirements.md) into OpenSpec **capabilities**
(`openspec/specs/<capability>/spec.md`) and defines the **change sequence** for
implementation (`openspec new change "<name>"`).

Each capability maps requirement IDs for traceability. Cross-cutting NFRs and security
constraints are listed per capability and re-validated in the final hardening change.

---

## Capability map

| # | Capability (spec id) | OpenSpec change name | Requirements |
|---|----------------------|----------------------|--------------|
| 1 | `app-foundation` | `add-app-foundation` | UI-001, UI-003, UI-004, NFR-005 |
| 2 | `data-model` | `add-data-model` | DATA-001, DATA-002, DATA-003, DATA-004 |
| 3 | `auth` | `add-auth` | FR-001, FR-002, FR-003, SEC-001, SEC-002, SEC-003 |
| 4 | `notes-core` | `add-notes-core` | FR-020, FR-021, FR-022, FR-024 |
| 5 | `folders-tags` | `add-folders-tags` | DATA-002, DATA-003, FR-061, FR-062 |
| 6 | `markdown-editor` | `add-markdown-editor` | UI-002, SEC-004 |
| 7 | `note-actions` | `add-note-actions` | FR-023 |
| 8 | `search` | `add-search` | FR-060, FR-061, FR-062, FR-063, FR-064, NFR-002 |
| 9 | `quality-hardening` | `add-quality-hardening` | NFR-001, NFR-003, NFR-004 |

---

## Dependency graph

```
app-foundation
      │
      ▼
data-model ─────────────────────────────┐
      │                                 │
      ▼                                 │
    auth                                  │
      │                                 │
      ▼                                 │
notes-core ◄────────────────────────────┘
      │
      ├──────────────┬──────────────┐
      ▼              ▼              ▼
folders-tags   markdown-editor   note-actions
      │              │              │
      └──────┬───────┴──────────────┘
             ▼
          search
             │
             ▼
    quality-hardening
```

---

## Implementation phases

### Phase 0 — Runnable shell (no backend)

**Change:** `add-app-foundation`  
**Capability:** `app-foundation`

| ID | Requirement |
|----|-------------|
| UI-001 | Light and dark themes |
| UI-003 | Collapsible sidebar |
| UI-004 | Responsive layout 320px–4K |
| NFR-005 | Desktop, tablet, mobile support |

**Deliverables**

- Next.js App Router layout with Notely design system
- Sidebar navigation shell (static routes)
- Theme toggle with persistence
- Responsive breakpoints verified

**Why first:** Every later change mounts UI here. No user data yet.

---

### Phase 1 — Persistence layer

**Change:** `add-data-model`  
**Capability:** `data-model`

| ID | Requirement |
|----|-------------|
| DATA-001 | Every note belongs to exactly one user |
| DATA-002 | Notes may belong to one folder |
| DATA-003 | Notes may have multiple tags |
| DATA-004 | Soft-deleted notes retained 30 days |

**Deliverables**

- Prisma schema: User, Note, Folder, Tag, NoteTag
- Migrations and seed script
- Scheduled job or query filter for 30-day purge (DATA-004)

**Depends on:** `app-foundation` (project structure)

**Why now:** Auth and notes both need a stable schema.

---

### Phase 2 — Identity and access

**Change:** `add-auth`  
**Capability:** `auth`

| ID | Requirement |
|----|-------------|
| FR-001 | Register with email and password |
| FR-002 | Login with email and password |
| FR-003 | Session persists across refresh |
| SEC-001 | Passwords hashed with Argon2 or bcrypt |
| SEC-002 | Input validated on client and server |
| SEC-003 | CSRF protection |

**Deliverables**

- Auth.js (or equivalent) with credentials provider
- Register / login / logout flows
- Protected routes and session middleware
- Zod validation on forms and server actions

**Depends on:** `data-model` (User table)

**Why now:** All note operations require an authenticated user (DATA-001).

---

### Phase 3 — Core note lifecycle

**Change:** `add-notes-core`  
**Capability:** `notes-core`

| ID | Requirement |
|----|-------------|
| FR-020 | Create a new note |
| FR-021 | Edit existing notes |
| FR-022 | Autosave after 1 s inactivity |
| FR-024 | Soft-delete notes |

**Deliverables**

- Note list and editor views
- Server actions or API for CRUD
- Debounced autosave with optimistic UI
- Trash view with `deletedAt` soft delete

**Depends on:** `auth`, `data-model`

**Why now:** Minimum viable product — create, edit, autosave, delete.

---

### Phase 4 — Organization (folders and tags)

**Change:** `add-folders-tags`  
**Capability:** `folders-tags`

| ID | Requirement |
|----|-------------|
| DATA-002 | Notes may belong to one folder |
| DATA-003 | Notes may have multiple tags |
| FR-061 | Filter notes by folder *(UI wiring; full search in phase 7)* |
| FR-062 | Filter notes by tag *(UI wiring; full search in phase 7)* |

**Deliverables**

- Folder CRUD and sidebar tree
- Tag CRUD and assignment on notes
- Folder/tag pickers in editor
- List views filtered by folder or tag

**Depends on:** `notes-core`

**Why now:** Search filters (FR-061, FR-062) need folder/tag data on notes.

---

### Phase 5 — Rich editing

**Change:** `add-markdown-editor`  
**Capability:** `markdown-editor`

| ID | Requirement |
|----|-------------|
| UI-002 | Editor keyboard shortcuts |
| SEC-004 | Sanitize user Markdown against XSS |

**Deliverables**

- Markdown editor component (headings, lists, code, checklists per PRD)
- Keyboard shortcut map
- Server-side and client-side HTML sanitization on render

**Depends on:** `notes-core`

**Why now:** Plain textarea satisfies FR-021; this change upgrades UX and closes SEC-004.

**Note:** Can run in parallel with phase 4 if team capacity allows.

---

### Phase 6 — Secondary note actions

**Change:** `add-note-actions`  
**Capability:** `note-actions`

| ID | Requirement |
|----|-------------|
| FR-023 | Duplicate notes |

**Deliverables**

- Duplicate action copying title, content, folder, tags
- Confirmation toast

**Depends on:** `notes-core`, `folders-tags` (copy folder/tags)

**Why later:** Medium priority; not blocking MVP.

---

### Phase 7 — Search and dynamic filters

**Change:** `add-search`  
**Capability:** `search`

| ID | Requirement |
|----|-------------|
| FR-060 | Full-text search on title and content |
| FR-061 | Filter by folder |
| FR-062 | Filter by tags |
| FR-063 | Filter by date range |
| FR-064 | Results update while typing |
| NFR-002 | Search responses within 300 ms |

**Deliverables**

- PostgreSQL full-text search (tsvector or equivalent)
- Search field with debounced live results
- Combined filters: query + folder + tags + date range
- Performance test for NFR-002

**Depends on:** `notes-core`, `folders-tags`

**Why now:** Needs populated notes, folders, and tags.

---

### Phase 8 — Quality gate

**Change:** `add-quality-hardening`  
**Capability:** `quality-hardening`

| ID | Requirement |
|----|-------------|
| NFR-001 | Initial page load &lt; 2 s |
| NFR-003 | Lighthouse Performance ≥ 95 |
| NFR-004 | WCAG 2.2 AA compliance |

**Deliverables**

- Bundle analysis and route-level code splitting
- Lazy-load heavy editor chunk
- Lighthouse CI run and fixes
- Accessibility audit (focus, labels, contrast, keyboard nav)

**Depends on:** All feature changes above

**Why last:** Measure and fix the full application, not isolated pieces.

**Ongoing:** Apply NFR-001 and NFR-004 incrementally during phases 0–7; this change is the formal acceptance gate.

---

## Step-by-step implementation workflow

Repeat the cycle below for **each capability in phase order** (0 → 8). Do not start the
next capability until the current one passes the exit gate (step 9).

```
┌─────────────────────────────────────────────────────────────────┐
│  FOR EACH CAPABILITY (phases 0–8)                               │
│                                                                 │
│  1 Prepare ──▶ 2 Propose ──▶ 3 Plan artifacts ──▶ 4 Review      │
│       │                                              │          │
│       │         ┌────────────────────────────────────┘          │
│       │         ▼                                               │
│       │    5 Implement ──▶ 6 Verify ──▶ 7 Sync specs            │
│       │         │                          │                    │
│       │         ▼                          ▼                    │
│       │    8 Archive ──▶ 9 Exit gate ──▶ NEXT CAPABILITY        │
└─────────────────────────────────────────────────────────────────┘
```

### Step 1 — Prepare

**Goal:** Confirm prerequisites and scope before opening a change.

1. Read [docs/current-state.md](current-state.md) — pick up where the last session stopped.
2. Identify the **next capability** from the [Capability map](#capability-map) (first row
   without a synced spec in `openspec/specs/<capability>/spec.md`).
3. Read the matching **Implementation phase** section in this document (deliverables,
   depends-on, requirement IDs).
4. Read affected sections in [requirements.md](requirements.md) and [PRD.md](PRD.md).
5. Confirm **dependencies are done** — archived changes exist for every capability listed
   under "Depends on" in that phase.
6. Start local services if needed (e.g. `docker compose up -d` for PostgreSQL from phase 1).

**Exit:** Scope is clear; blockers are recorded in `docs/current-state.md`.

---

### Step 2 — Create the OpenSpec change

**Goal:** Scaffold the change directory.

```bash
openspec new change "<change-name>"
```

Use the **OpenSpec change name** from the capability map (e.g. `add-app-foundation`).

Verify:

```bash
openspec status --change "<change-name>"
openspec list
```

**Exit:** Change exists under `openspec/changes/<change-name>/` with `.openspec.yaml`.

---

### Step 3 — Generate planning artifacts

**Goal:** Produce proposal, design, and tasks before writing feature code.

**Cursor:** run `/opsx:propose` (or ask the agent to use the `openspec-propose` skill).

Artifact order (spec-driven schema):

| Order | Artifact | Purpose |
|-------|----------|---------|
| 1 | `proposal.md` | What and why; scope and non-goals |
| 2 | `design.md` | How — architecture, data flow, key decisions |
| 3 | `tasks.md` | Checkbox list of implementation steps |

Check progress:

```bash
openspec status --change "<change-name>" --json
```

All artifacts in `applyRequires` must be `done` before step 5.

**Exit:** `proposal.md`, `design.md`, and `tasks.md` exist and list requirement IDs from this capability.

---

### Step 4 — Review artifacts (human gate)

**Goal:** Catch scope drift before implementation.

Review checklist:

- [ ] Every requirement ID for this capability appears in proposal or tasks
- [ ] Design matches project stack (Next.js, Prisma, Auth.js, Notely design system)
- [ ] Tasks are ordered and each is completable in one session
- [ ] No out-of-scope features from later phases
- [ ] Non-goals are explicit

If something is wrong, edit artifacts in `openspec/changes/<change-name>/` or re-run
`/opsx:propose` with corrections. Do **not** skip to implementation with a broken plan.

**Exit:** Artifacts approved (explicit sign-off or no open review comments).

---

### Step 5 — Implement tasks

**Goal:** Execute `tasks.md` one checkbox at a time.

**Cursor:** run `/opsx:apply` (or ask the agent to use the `openspec-apply-change` skill).

Per-task loop:

1. Read context files from `openspec instructions apply --change "<change-name>" --json`
2. Pick the next `- [ ]` task
3. Implement minimal code for that task only
4. Mark task `- [x]` in `tasks.md`
5. Repeat until all tasks are checked or a blocker appears

Useful commands during implementation:

```bash
npm run dev          # manual smoke test
npm run lint         # ESLint
npm run build        # type-check + production build
npx prisma migrate dev   # when schema changes (phase 1+)
```

**Pause rules:** Stop and update `design.md` / `tasks.md` if implementation reveals a
design gap — do not hack around a bad plan.

**Exit:** All tasks in `tasks.md` marked `- [x]`.

---

### Step 6 — Verify against requirements

**Goal:** Prove this capability satisfies its requirement IDs before archiving.

Capability-specific checks:

| Capability | Minimum verification |
|------------|---------------------|
| `app-foundation` | Theme toggle persists; sidebar collapses; layout works at 320px and 1920px |
| `data-model` | Migrations apply; seed runs; DATA-004 purge/query documented |
| `auth` | Register, login, logout; session survives refresh; invalid creds rejected |
| `notes-core` | Create, edit, autosave after 1 s idle, soft-delete to trash |
| `folders-tags` | Folder/tag CRUD; assign on note; list filtered by folder or tag |
| `markdown-editor` | Markdown renders; shortcuts work; XSS payload sanitized |
| `note-actions` | Duplicate creates copy with folder and tags |
| `search` | Full-text + filters; results update while typing; spot-check NFR-002 |
| `quality-hardening` | Lighthouse ≥ 95; WCAG spot-check; load time spot-check |

Record verification notes in the change's `tasks.md` or a short comment in the PR.

**Exit:** Every requirement ID for this capability has a passing manual or automated check.

---

### Step 7 — Sync specs to main

**Goal:** Merge delta specs into permanent capability specs.

**Cursor:** run `/opsx:sync` (or use the `openspec-sync-specs` skill).

```bash
openspec status --change "<change-name>" --json   # find delta spec paths
```

Apply deltas to:

```
openspec/specs/<capability>/spec.md
```

Main spec paths for this project:

```
openspec/specs/
├── app-foundation/spec.md
├── data-model/spec.md
├── auth/spec.md
├── notes-core/spec.md
├── folders-tags/spec.md
├── markdown-editor/spec.md
├── note-actions/spec.md
├── search/spec.md
└── quality-hardening/spec.md
```

**Exit:** `openspec/specs/<capability>/spec.md` reflects what was built.

---

### Step 8 — Archive the change

**Goal:** Close the change and move it out of active work.

**Cursor:** run `/opsx:archive` (or use the `openspec-archive-change` skill).

Pre-archive checklist:

- [ ] All artifacts `done` (`openspec status --change "<change-name>"`)
- [ ] All tasks `- [x]`
- [ ] Specs synced (step 7)
- [ ] App builds (`npm run build`)

```bash
openspec archive "<change-name>"
```

Archived changes live under `openspec/changes/archive/YYYY-MM-DD-<change-name>/`.

**Exit:** Change no longer appears in `openspec list` as active.

---

### Step 9 — Exit gate (before next capability)

**Goal:** Leave the repo in a merge-ready state for the next cycle.

1. Update [docs/current-state.md](current-state.md):
   - **Last updated** — ISO 8601 UTC timestamp
   - **Last session summary** — what was done
   - **Current focus** — next capability / change name
   - **Completed recently** — add archived change
   - **Blockers / open questions**
   - **Files touched**
2. Confirm no active OpenSpec change remains unless intentionally paused mid-capability.
3. Look up the **next row** in the [Capability map](#capability-map) and return to **Step 1**.

**Hard stops — do not proceed to the next capability if:**

| Condition | Action |
|-----------|--------|
| Depends-on capability not archived | Finish or archive the dependency first |
| Active change with incomplete tasks | Resume `/opsx:apply` or explicitly pause in `current-state.md` |
| Build or lint fails | Fix before archiving |
| Requirement ID untested | Complete step 6 |

---

### Quick reference — Cursor commands

| Step | Command / skill |
|------|-----------------|
| 3 — Plan | `/opsx:propose` → `openspec-propose` |
| 5 — Implement | `/opsx:apply` → `openspec-apply-change` |
| 7 — Sync | `/opsx:sync` → `openspec-sync-specs` |
| 8 — Archive | `/opsx:archive` → `openspec-archive-change` |
| Explore / spike | `/opsx:explore` → `openspec-explore` |

---

### Capability sequence checklist

Track progress by checking off each full cycle (steps 1–9):

- [x] **Phase 0** — `add-app-foundation` → `app-foundation`
- [x] **Phase 1** — `add-data-model` → `data-model`
- [x] **Phase 2** — `add-auth` → `auth`
- [x] **Phase 3** — `add-notes-core` → `notes-core`
- [x] **Phase 4** — `add-folders-tags` → `folders-tags`
- [x] **Phase 5** — `add-markdown-editor` → `markdown-editor`
- [x] **Phase 6** — `add-note-actions` → `note-actions`
- [x] **Phase 7** — `add-search` → `search`
- [x] **Phase 8** — `add-quality-hardening` → `quality-hardening`

**MVP milestone:** phases 0–3 checked = shippable core product.

---

## Requirement coverage checklist

| Prefix | Total in requirements.md | Covered by capabilities |
|--------|------------------------|-------------------------|
| FR | 14 | 14 |
| NFR | 5 | 5 |
| UI | 4 | 4 |
| SEC | 4 | 4 |
| DATA | 4 | 4 |

No requirement ID from [requirements.md](requirements.md) is orphaned.

---

## Parallelization options

| Can run in parallel | Pair |
|---------------------|------|
| Yes (after notes-core) | `add-folders-tags` + `add-markdown-editor` |
| Yes (after folders-tags) | `add-note-actions` while search is in progress |
| No | `add-auth` before `add-notes-core` |
| No | `add-search` before `add-folders-tags` |

**Critical path:**  
`app-foundation` → `data-model` → `auth` → `notes-core` → `folders-tags` → `search` → `quality-hardening`

**Estimated MVP (phases 0–3):** shell + schema + auth + notes CRUD/autosave/delete.

---

## Next step

Follow [Step-by-step implementation workflow](#step-by-step-implementation-workflow), starting at **Step 1**:

```bash
openspec new change "add-app-foundation"
```

Then `/opsx:propose` → review → `/opsx:apply` → verify → `/opsx:sync` → `/opsx:archive`.
