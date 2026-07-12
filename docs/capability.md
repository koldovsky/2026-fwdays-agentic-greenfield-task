# Capability map — order & dependencies

Last updated: 2026-07-10

**This file answers:** what order? what blocks what? what unlocks next?

| Read this for… | File |
| --- | --- |
| Order, dependencies, next steps | **This file** |
| Session handoff & active work | [current-state.md](current-state.md) |
| Expanded scope per capability | [capabilities/](capabilities/) |
| Authoritative behavior | `openspec/specs/<id>/spec.md` |
| Gate enforcement | `openspec/capability-map.yaml` |

```bash
npm run capability:check -- --capability <id>
/opsx:propose add-<id>
```

> **Preview tip (Cursor):** `Cmd+Shift+V` — Markdown preview. Wide tables are hard to read in any viewer; this file uses **narrow tables per slice** instead of one mega-table.

---

## 0. Where we are now

| Field | Value |
| --- | --- |
| **Last shipped** | S4b `export-share` preview — print, HTML download, browser PDF |
| **Previously shipped** | S4 `form-input`; S3 `document-render`; S2 directories + banking; S1 domain; S0 shell |
| **Active slice** | **Submission-ready MVP** — post-MVP: S5 `invoice-registry` or S6 pdf |
| **OpenSpec ready to propose** | `/opsx:propose add-invoice-registry` or `add-export-share-pdf` |
| **Archived changes** | **10** in `openspec/changes/archive/` (S0–S4b) |
| **Demo target** | M4 — supplier + client → form → preview → export ✅ |

**Unblocked now:** S5 `invoice-registry` or S6 `export-share` pdf (wayfinder 05)

```bash
npm run capability:check -- --capability invoice-registry
npm run test   # Vitest (220 tests)
```

### S4b complete ✅

| Capability | Change | Outcome |
| --- | --- | --- |
| `export-share` preview | `add-export-share-preview` | Print, download HTML, browser PDF on `/invoices/new` |

### S4 complete ✅

| Capability | Change | Outcome |
| --- | --- | --- |
| `form-input` | `add-form-input` | `/invoices/new` — form, short paste, client prefill, live HTML preview |

### S2 + S3 complete ✅

| Capability | PR | OpenSpec archive |
| --- | --- | --- |
| `supplier-profile` | #5 merged | `2026-07-10-add-supplier-profile` |
| `client-directory` | #4 merged | `2026-07-10-add-client-directory` |
| `banking` | #7 merged | `2026-07-10-add-banking` |
| `document-render` | merged | `2026-07-10-add-document-render` |
| embedded fonts | merged | `2026-07-10-add-embedded-fonts` |

### Resolved decisions (no longer gate calc)

| Ticket | Decision | Affects |
| --- | --- | --- |
| 06 | Integer cents; user enters unit price × qty → line total; display `1,234.56` everywhere | `invoice-calc` |
| 07 | Sequential `YYYY-NNN` on issue, per supplier; opaque record id; `DDMM/0YY` retired | `invoice-calc`, `invoice-registry` |
| 15 | Vanished FRs were spec accidents; propagated to map | all specs |

### Open decisions (still gate later slices)

| Ticket | Topic | Blocks |
| --- | --- | --- |
| 05 | PDF fidelity (stateless Chromium) | `export-share` pdf (S6) |
| 16 | Edit after send / immutability | `invoice-edit` |
| 11 | Design system reconciliation | `form-input` polish |

---

## 1. Roadmap by slice

Work top → bottom. Within a slice, rows without mutual dependency can run **in parallel**.

### S0 — Foundation ✅

| Step | Capability | Owner | Status | Doc |
| --- | --- | --- | --- | --- |
| 1 | `shell` | ui | **shipped** | [detail](capabilities/shell.md) |

### S1 — Domain core (parallel, no UI) ✅

| Step | Capability | Owner | Status | OpenSpec | Doc |
| --- | --- | --- | --- | --- | --- |
| 2a | `nace-catalog` | domain | **shipped** | `add-nace-catalog` synced | [detail](capabilities/nace-catalog.md) |
| 2b | `invoice-calc` | domain | **shipped** | `add-invoice-calc` synced | [detail](capabilities/invoice-calc.md) |

### S2 — Directories ✅

| Step | Capability | Owner | Status | Depends on | Doc |
| --- | --- | --- | --- | --- | --- |
| 3a | `supplier-profile` | ui | **shipped** | shell ✅ | [detail](capabilities/supplier-profile.md) |
| 3b | `client-directory` | ui | **shipped** | shell ✅ | [detail](capabilities/client-directory.md) |
| 3c | `banking` | domain | **shipped** | supplier-profile ✅ | [detail](capabilities/banking.md) |

### S3 — Render ✅

| Step | Capability | Owner | Status | Doc |
| --- | --- | --- | --- | --- |
| 4 | `document-render` | domain | **shipped** | [detail](capabilities/document-render.md) |

### S4 — Create flow (demo milestone) ← **next**

| Step | Capability | Owner | Status | Doc |
| --- | --- | --- | --- | --- |
| 5a | `form-input` | ui | **shipped** | [detail](capabilities/form-input.md) |
| 5b | `export-share` (preview) | ui | not_started | [detail](capabilities/export-share.md) |

### S5 — Persistence

| Step | Capability | Owner | Status | Doc |
| --- | --- | --- | --- | --- |
| 6 | `invoice-registry` | ui | not_started | [detail](capabilities/invoice-registry.md) |

### S6 — Lifecycle

| Step | Capability | Owner | Status | Gate | Doc |
| --- | --- | --- | --- | --- | --- |
| 7a | `export-share` (pdf) | ui | not_started | `npm run capability:check -- --capability export-share --gate pdf` | [detail](capabilities/export-share.md#pdf-gate-s6) |
| 7b | `invoice-edit` | ui | not_started | — | [detail](capabilities/invoice-edit.md) |

`export-share` is one capability with two gates: **preview** (S4) ships first; **pdf** (S6) ships after preview + wayfinder 05.

---

## 2. Dependency matrix

Blocked until every **Depends on** row is `shipped` in `capability-map.yaml`.

| Capability | Depends on | Then unblocks |
| --- | --- | --- |
| `shell` | — | supplier-profile, client-directory |
| `nace-catalog` | — | document-render, form-input |
| `invoice-calc` | — | document-render, invoice-registry, invoice-edit |
| `supplier-profile` | shell | banking |
| `client-directory` | shell | form-input |
| `banking` | supplier-profile | document-render |
| `document-render` | invoice-calc, banking, nace-catalog | form-input, export-share, invoice-registry |
| `form-input` | shell, supplier-profile, client-directory, nace-catalog, banking, document-render | export-share, invoice-registry |
| `export-share` preview | document-render, form-input | pdf gate |
| `invoice-registry` | form-input, document-render, invoice-calc | invoice-edit |
| `export-share` pdf | document-render, form-input, export-share preview | — |
| `invoice-edit` | invoice-registry, form-input, invoice-calc | MVP complete |

### Critical path to demo (M4)

```
shell ✅
  → nace-catalog ✅ ∥ invoice-calc ✅
  → supplier-profile ✅ ∥ client-directory ✅ → banking ✅
  → document-render
  → form-input → export-share (preview)
```

---

## 3. Dependency graph

```
S0  shell ── shipped ✅ ────────────────────────────────┐
         │                                              │
         ├──────────────────┬──────────────────────────┤
         ▼                  ▼                          ▼
S1  nace-catalog ✅   invoice-calc ✅
         │                  │
         ▼                  │
S2  supplier-profile ✅ ──► banking ✅          client-directory ✅
         │                  │                          │
         └────────┬─────────┴─────────────┬────────────┘
                  ▼                       │
S3           document-render ✅ ◄──────────┘
                  │
                  ▼
S4           form-input ──► export-share (preview)   ← next
                  │
                  ▼
S5           invoice-registry
                  │
                  ▼
S6           export-share (pdf) + invoice-edit
```

---

## 4. Slice chain (what opens next)

| Finish slice | Unlocks | User sees |
| --- | --- | --- |
| S0 ✅ | S2 directories | App shell + nav |
| S1 ✅ | S2 + part of S3 | Domain libs + Vitest (129 tests) |
| S2 | S3 render | Supplier/client in browser |
| S3 | S4 create flow | HTML from template |
| S4 | S5 registry | **Form → live preview** |
| S5 | S6 lifecycle | Saved invoices |
| S6 | — | PDF + edit |

---

## 5. Milestones

| ID | Slice | Outcome | Status |
| --- | --- | --- | --- |
| M0 | S0 | Shell + health | **done** |
| M1 | S1 | `src/lib/` + Vitest | **done** |
| M2 | S2 | Directories + banking | **done** |
| M3 | S3 | Rendered HTML | **done** |
| **M4** | **S4** | **Form → preview** | **done** |
| M5 | S5 | Invoice register | blocked |
| M6 | S6 | PDF + edit | blocked |

---

## 6. Workflow

1. Read [current-state.md](current-state.md) for active session context
2. Pick a step from **§1** — check **§2** dependencies are shipped
3. `npm run capability:check -- --capability <id>`
4. Read expanded doc in [capabilities/](capabilities/)
5. `/opsx:propose add-<id>` → `/opsx:apply` (or apply existing change)
6. Verify: `npm run typecheck && npm run lint && npm run build` (+ Vitest when added)
7. `/opsx:sync` → `status: shipped` in `capability-map.yaml` → `/opsx:archive`
8. Append session row to [current-state.md](current-state.md)

### Recommended next actions

| Priority | Action | Why |
| --- | --- | --- |
| 1 | `/opsx:propose add-form-input` | S4 unblocked — the M4 demo milestone |
| 2 | Wayfinder 05 (human) | Prototype PDF; note the template's Google Fonts `@import` will not resolve offline in headless Chromium |
| 3 | Update mentor PR #50 body | Reflect S3 complete + 193 tests |

PRs [#4](https://github.com/eresemai/2026-fwdays-agentic-greenfield-task-INVOICE-MAKER-2026/pull/4), [#5](https://github.com/eresemai/2026-fwdays-agentic-greenfield-task-INVOICE-MAKER-2026/pull/5), [#6](https://github.com/eresemai/2026-fwdays-agentic-greenfield-task-INVOICE-MAKER-2026/pull/6), and [#7](https://github.com/eresemai/2026-fwdays-agentic-greenfield-task-INVOICE-MAKER-2026/pull/7) are merged; all S2 OpenSpec changes archived (see §0).
