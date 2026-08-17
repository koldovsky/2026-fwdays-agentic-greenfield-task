## Context

Capability `wizard-shell` is phase 3 of the MVP. `document-session` is shipped: create/redirect, `/docs/[guid]` resume, `GET`/`PATCH /api/docs/[guid]`, kebab-case JSON with `current-step` 1–7. The docs page still uses stub metadata + `SessionStubControls` (manual step select / completed checkbox). DESIGN.md §5 and §7 define progress circles, Back/Next, and the neutral financial palette. Later step capabilities need a shared chrome to plug into; this change replaces the stub with that shell while keeping step bodies as placeholders.

## Goals / Non-Goals

**Goals:**

- Progress UI: circles numbered 1…7; current step highlighted; past steps filled; future outlined (FR-18, NFR-02)
- Назад / Далі on unfinished sessions with edge rules: no Назад on step 1; no Далі past step 7 (or Далі disabled / hidden on last step) (FR-17)
- Persist `current-step` via existing PATCH on every successful navigation so reload restores the same step (NFR-03, NFR-04, TC-21)
- Neutral financial UI tokens from DESIGN.md (NFR-01): off-white page, white step panel, muted blue-gray accent, IBM Plex Sans / Source Sans 3
- Stub step content slots (title + placeholder) for steps 1–7 so TC-20 can be verified without real forms
- Completed sessions: keep final-review presentation (step 7 semantics); wizard nav for editing returns in later capabilities
- Surface PATCH/save failures to the user (NFR-10); do not advance UI as if save succeeded
- Local step transition feel targeting < 300 ms when session data is already loaded (NFR-09)

**Non-Goals:**

- Real step forms or per-step validation before Далі (`document-type` … `pdf-export`)
- Setting `completed` via wizard chrome (finalization belongs to later steps / pdf-export)
- Clicking progress circles to jump arbitrarily (optional later; not required by TC-20)
- Auth, ЕДО, legal guarantees (BC-02, BC-03, BC-08)
- Changing `document-session` API contract or FS layout

## Decisions

### 1. Client wizard shell over server-loaded session

- **Choice:** Keep `/docs/[guid]` as a Server Component that loads the session (and error panels). Pass `guid` + initial `current-step` (+ `completed`) into a client `WizardShell` that owns progress, nav, optimistic/local step display, and PATCH.
- **Rationale:** Matches existing stub pattern; navigation needs interactivity; server still owns auth-less load and invalid-guid handling.
- **Alternatives:** Full client fetch-only page — rejected (worse first paint, duplicates error UI). Server Actions for step change — possible later; PATCH already works and is tested.

### 2. Navigation and persistence order

- **Choice:** On Далі / Назад: compute next step → `PATCH { "current-step": next }` → on success update local step and `router.refresh()`; on failure show error and keep previous step. Do not change step in UI until save succeeds (or use optimistic UI only if rollback on failure is explicit — prefer wait-for-save for MVP clarity).
- **Rationale:** Guarantees reload matches what the user saw after a successful click (NFR-04). NFR-09 is still achievable with local FS PATCH.
- **Alternatives:** Optimistic step then PATCH — faster feel but risk of desync on failure; acceptable only with hard rollback.

### 3. Edge rules and completed sessions

- **Choice:**
  - Steps are always `1 | 2 | 3 | 4 | 5 | 6 | 7` (`WizardStep`).
  - Step 1: Назад disabled/hidden; Далі → 2.
  - Steps 2–6: both enabled.
  - Step 7 (unfinished): Назад → 6; Далі disabled/hidden (reaching “completed” is not this capability’s job).
  - If `completed === true`: show final-review layout (existing placeholder + export); do not show stub Back/Next for free editing in this change (FR-16 “Редагувати” comes with pdf-export). Progress may still show step 7 as current.
- **Rationale:** TC-20 needs Back/Next + circles on the flow; completion/edit is out of scope.
- **Alternatives:** Далі on step 7 sets `completed: true` — deferred to pdf-export / template-fill.

### 4. Progress circle semantics

- **Choice:** Render seven circles. Current = accent fill + emphasis. Steps `< current` = filled/muted complete. Steps `> current` = outline only. Circles are not required to be clickable in this change.
- **Rationale:** Matches DESIGN.md §5 and NFR-02; keeps scope to TC-20.
- **Alternatives:** Clickable jump — nice-to-have; skip until validation exists.

### 5. Step body slots

- **Choice:** `WizardShell` renders a white panel with a stub heading per step (e.g. “Крок 1 — Тип документа”) and short placeholder copy. Structure so later capabilities replace the slot (children map or `stepComponents[step]`).
- **Rationale:** Proves chrome without blocking on step specs; clear extension point.
- **Alternatives:** Empty panel — weaker for demos/TC.

### 6. Design tokens

- **Choice:** Introduce CSS variables (or Tailwind theme extension) aligned with DESIGN.md:

| Token | Value |
|-------|-------|
| `--wizard-bg` | `#F5F6F8` |
| `--wizard-surface` | `#FFFFFF` |
| `--wizard-border` | `#E2E4E8` |
| `--wizard-text` | `#1A1D21` |
| `--wizard-muted` | `#5C6370` |
| `--wizard-accent` | `#3D5A80` |

  Load IBM Plex Sans or Source Sans 3 via `next/font`. Buttons: radius 4–6px, not pills. Apply page background on the docs route (or root layout if it does not fight marketing pages — prefer docs layout / shell wrapper).
- **Rationale:** NFR-01; capabilities.md says design tokens land with wizard-shell.
- **Alternatives:** Hardcoded hex only in classNames (already partially done) — variables make later steps consistent.

### 7. Remove stub controls

- **Choice:** Delete or stop rendering `SessionStubControls` once WizardShell covers step changes. Keep “Download JSON” export link for FR-19 demos.
- **Rationale:** Avoid two competing ways to change step.
- **Alternatives:** Leave stub behind a `?debug=1` — unnecessary if shell is solid.

### 8. Testing

- **Choice:** Prefer component/integration tests where practical (progress renders current; Назад on 1 disabled; Далі advances and calls PATCH). Manual check on `next dev`: navigate 1→7→back, reload mid-flow (TC-20, TC-21). No new FS module required.
- **Rationale:** Behavior is mostly UI + existing API.

## Risks / Trade-offs

- [PATCH latency vs NFR-09] → Keep payload tiny (`current-step` only); local FS should be well under 300 ms; measure if slow.
- [Double-click Далі] → Disable buttons while pending (`useTransition` / pending flag).
- [Completed vs step 7 unfinished] → Document clearly in UI copy; do not auto-set `completed`.
- [Font loading FOIT] → Use `next/font` with swap; fallback system sans briefly OK.
- [Later steps need block Далі on invalid form] → Shell should accept optional `canGoNext` later; for now always allow Next on stubs.

## Migration Plan

1. Add tokens/font; build `WizardShell` + progress + nav; wire into `/docs/[guid]`.
2. Remove stub controls; keep export + error panels.
3. Verify TC-20 and reload TC-21 on unfinished session.
4. Rollback = revert UI files; session JSON unchanged.

## Open Questions

- None blocking. Optional: allow circle click to jump — defer unless product asks during apply.
