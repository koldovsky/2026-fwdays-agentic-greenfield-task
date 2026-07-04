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

## Suggested OpenSpec workflow per change

For each change in order:

```bash
openspec new change "<change-name>"
# Generate: proposal.md → design.md → tasks.md
# Implement via /opsx:apply
# Archive when done: openspec archive <change-name>
```

After archiving, sync capability specs:

```bash
openspec sync-specs   # or /opsx:sync
```

Target spec paths:

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

Start with:

```bash
openspec new change "add-app-foundation"
```

Then run `/opsx:propose` or `/opsx:apply` for that change.
