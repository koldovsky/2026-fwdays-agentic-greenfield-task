# TinyStart Demo — Rehearsal Checklist (≤75 s product segment)

**Flow:** APP_SPEC.md §7 Flow A (first visit → first focus) + Flow D (recap)  
**Canonical data:** `docs/demo-capabilities.md` → `demo-script`  
**Viewport:** 1280×800 · **Storage:** cleared before take

| # | Action | FR-* IDs | Est. |
|---|--------|----------|------|
| 1 | Open `http://localhost:3000/` in private window (cleared `localStorage`) | FR-STORAGE-01, FR-HOME-04 | 3 s |
| 2 | Pause on empty Home — illustration + onboarding line visible | FR-HOME-04 | 2 s |
| 3 | In quick-add, type **Draft project README** → **Add task** | FR-CAPTURE-01, FR-HOME-03 | 5 s |
| 4 | Land on `/tasks/[id]` — title visible | FR-TASK-01 | 2 s |
| 5 | Fill motivation: **Ship the course assignment on time** (autosave, no Save button) | FR-MOTIVATION-01, FR-TASK-04 | 6 s |
| 6 | Add step **Open outline** → **Add step** | FR-TASK-02 | 3 s |
| 7 | Add step **Write setup section** | FR-TASK-02 | 3 s |
| 8 | Add step **Add demo video link** | FR-TASK-02 | 3 s |
| 9 | Click nav **Home** (or logo) | FR-SHELL-02 | 2 s |
| 10 | Hero shows task title + **Step 1 of 3** + motivation snippet | FR-TASK-05, FR-HOME-02, FR-MOTIVATION-02 | 4 s |
| 11 | Click **Start focus** (≤2 clicks from Home) | FR-FOCUS-08, FR-HOME-01 | 3 s |
| 12 | On `/focus/[taskId]`, tap **2 min** preset | FR-FOCUS-01 | 3 s |
| 13 | Focus view: current step title + calm timer (no red) | FR-FOCUS-04, BC-UX-01 | 3 s |
| 14 | Tap **Done with this step** — advances to step 2 of 3 | FR-FOCUS-07 | 3 s |
| 15 | Let timer run ~10 s live (jump-cut wait in edit) | FR-FOCUS-05 | 10 s |
| 16 | Tap **End session** *or* let timer complete → celebration copy + duration | FR-COMPLETE-01 | 5 s |
| 17 | Tap **Take a break** → Home | FR-COMPLETE-03 | 3 s |
| 18 | Micro recap strip: **Today: X min focused** | FR-HOME-06 | 3 s |
| 19 | Nav → **Recap** (`/recap`) | FR-RECAP-01, FR-SHELL-01 | 2 s |
| 20 | Stats visible (minutes, tasks, steps) — forgiving tone | FR-RECAP-01, FR-RECAP-02 | 3 s |
| 21 | Toggle reflection tag **Breakdown** (or **Tiny start**) | FR-RECAP-03 | 3 s |

**Total (product segment): ~72 s** (trim step 15 in edit to hit ≤75 s on camera)

---

## Pre-flight (before recording)

- [ ] NFR-DX-01 gate green
- [ ] Production server: `npm run build && npm start` → `http://localhost:3000`
- [ ] DevTools → Application → **Clear site data** (or private window)
- [ ] macOS Do Not Disturb on
- [ ] One dry run timed ≤ 90 s

## Routes reference

| Route | When to open |
|-------|----------------|
| `/` | Steps 1–3, 9–11, 17–18 |
| `/tasks/[id]` | Steps 4–8 (auto after quick-add) |
| `/focus/[taskId]` | Steps 11–16 |
| `/recap` | Steps 19–21 |

## Do not show (out of scope)

- Accounts, AI breakdown, guilt metrics, energy tag (skip `FR-CAPTURE-02` if over budget)
