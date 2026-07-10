# TinyStart — Test Specification

**Purpose:** Maker ≠ checker validation plan for the completed MVP.  
**Audience:** Human tester (you or a separate review agent).  
**Output:** One filled proof file per part in [`validation/proof/`](proof/).

**Source of truth:** [`docs/requirements.md`](../docs/requirements.md) · [`docs/APP_SPEC.md`](../docs/APP_SPEC.md) · [`docs/design.md`](../docs/design.md)

---

## 1. Scope

### In scope (MVP P0 + P1)

| Capability | Routes / surface | Requirement IDs |
|------------|------------------|-----------------|
| Automated gate | CI / local scripts | `NFR-DX-01`, `TC-STACK-05` |
| Shell | `/`, layout, nav | `FR-SHELL-01`–`03` |
| Storage | `lib/storage` | `FR-STORAGE-01`–`03`, `TC-DATA-01`, `TC-PURE-01` |
| Quick capture | Home inline add, `/tasks/new` | `FR-CAPTURE-01`–`02` |
| Motivation bridge | Task detail, Home hero | `FR-MOTIVATION-01`–`02` |
| Task breakdown | `/tasks/[id]` | `FR-TASK-01`–`07` |
| Focus session | `/focus/[taskId]` | `FR-FOCUS-01`–`08` |
| Completion | Post-timer celebration | `FR-COMPLETE-01`–`03` |
| Today Home | `/` | `FR-HOME-01`–`07` |
| Daily recap (P1) | `/recap` | `FR-RECAP-01`–`03` |
| Cross-cutting | All screens | `NFR-A11Y-*`, `NFR-BROWSER-01`, `BC-*`, `BC-DEMO-01` |

### Out of scope

Per [`docs/requirements.md`](../docs/requirements.md) out-of-scope list: accounts, cloud sync, AI breakdown, notifications, dark mode (`FR-SHELL-04` dropped), `/tasks` list, `/settings`.

---

## 2. Test levels

| Level | What | Tooling | Proof file |
|-------|------|---------|------------|
| **L0 — Build gate** | Lint, types, unit tests, production build | `npm run lint && npm run typecheck && npm test && npm run build` | `00-automated-gate` |
| **L1 — Unit / logic** | Pure `lib/` behavior | Vitest (`*.test.ts`) | Relevant capability proof |
| **L2 — Route smoke** | Pages render without crash | `app/routes.smoke.test.tsx` | `01-shell` |
| **L3 — Manual UI** | Interaction, persistence, copy | Browser + dev server | Per-capability proofs |
| **L4 — Integration** | Multi-screen flows | Manual walkthrough | `13-e2e-flows` |
| **L5 — Acceptance** | Course demo criteria | 1–2 min recording | `14-demo-acceptance` |

---

## 3. Execution order

Run proofs in dependency order:

```
00-automated-gate
  → 01-shell → 02-storage
  → 03-quick-capture → 04-motivation-bridge → 05-task-breakdown
  → 06-focus-session → 07-completion → 08-today-home
  → 09-daily-recap
  → 10-accessibility → 11-ux-brand-constraints → 12-browser-smoke
  → 13-e2e-flows → 14-demo-acceptance
```

---

## 4. Part specifications

### Part 00 — Automated quality gate

**Proof:** [`proof/00-automated-gate.proof.md`](proof/00-automated-gate.proof.md)  
**IDs:** `NFR-DX-01`, `TC-STACK-05`

| Step | Command / action | Pass criteria |
|------|------------------|---------------|
| TS-00-01 | `npm run lint` | Exit code 0, no errors |
| TS-00-02 | `npm run typecheck` | Exit code 0 |
| TS-00-03 | `npm test` | All tests pass (see §5 test inventory) |
| TS-00-04 | `npm run build` | Production build succeeds |

---

### Part 01 — Shell & navigation

**Proof:** [`proof/01-shell.proof.md`](proof/01-shell.proof.md)  
**IDs:** `FR-SHELL-01`, `FR-SHELL-02`, `FR-SHELL-03`  
**Routes:** `/`, `/tasks/new`, `/tasks/[id]`, `/focus/[taskId]`, `/recap`

| Step | Action | Pass criteria |
|------|--------|---------------|
| TS-01-01 | Open `/` | Today Home renders; skip-to-content link present |
| TS-01-02 | Navigate to `/tasks/new` | Quick capture page loads |
| TS-01-03 | Create task → land on `/tasks/[id]` | Task detail loads for new task |
| TS-01-04 | Open `/focus/[taskId]` | Focus preset picker loads; **no** main app nav visible |
| TS-01-05 | Open `/recap` | Daily recap loads inside shell |
| TS-01-06 | Resize to mobile width (~375px) | Layout usable; no horizontal scroll on focus screen |
| TS-01-07 | Tab through shell routes | Logical focus order; visible `:focus-visible` rings |

**Automated:** `app/routes.smoke.test.tsx`

---

### Part 02 — Storage & persistence

**Proof:** [`proof/02-storage.proof.md`](proof/02-storage.proof.md)  
**IDs:** `FR-STORAGE-01`, `FR-STORAGE-02`, `FR-STORAGE-03`, `NFR-PRIV-01`, `BC-PRIVACY-01`

| Step | Action | Pass criteria |
|------|--------|---------------|
| TS-02-01 | Create task + steps | Data in `localStorage` under app key |
| TS-02-02 | Hard refresh browser | Task and steps still present |
| TS-02-03 | Start focus, pause, navigate to `/` | Return to focus → resume prompt appears |
| TS-02-04 | End session, refresh | Daily stats persisted |
| TS-02-05 | DevTools → Application → Local Storage | No network calls; data stays on device |

**Automated:** `lib/storage/storage.test.ts`, `lib/focus/session-store.test.ts`

---

### Part 03 — Quick capture

**Proof:** [`proof/03-quick-capture.proof.md`](proof/03-quick-capture.proof.md)  
**IDs:** `FR-CAPTURE-01`, `FR-CAPTURE-02`, `FR-HOME-03`

| Step | Action | Pass criteria |
|------|--------|---------------|
| TS-03-01 | Home quick-add: type title, submit | Task created; appears on Home or navigates to detail |
| TS-03-02 | `/tasks/new`: add task with title only | Task saved; redirects to task detail |
| TS-03-03 | `/tasks/new`: set energy tag (low/med/high) | Tag persisted on task detail after save |
| TS-03-04 | Submit empty title | No task created; no error shame copy |

**Automated:** `lib/tasks/create-task.test.ts`

---

### Part 04 — Motivation bridge

**Proof:** [`proof/04-motivation-bridge.proof.md`](proof/04-motivation-bridge.proof.md)  
**IDs:** `FR-MOTIVATION-01`, `FR-MOTIVATION-02`

| Step | Action | Pass criteria |
|------|--------|---------------|
| TS-04-01 | Task detail: enter multi-word motivation | Text saves (debounced); survives refresh |
| TS-04-02 | Type spaces mid-edit | No trim-on-keystroke while typing |
| TS-04-03 | Clear field to whitespace only | Field clears on save |
| TS-04-04 | Set motivation → return Home | Hero card shows motivation snippet |

---

### Part 05 — Task breakdown

**Proof:** [`proof/05-task-breakdown.proof.md`](proof/05-task-breakdown.proof.md)  
**IDs:** `FR-TASK-01`–`07`

| Step | Action | Pass criteria |
|------|--------|---------------|
| TS-05-01 | Edit task title | Autosave indicator; persists after 1200ms debounce |
| TS-05-02 | Blur title field | Immediate flush save |
| TS-05-03 | Add 3–7 sub-steps | Steps ordered; count enforced |
| TS-05-04 | Reorder steps (drag or controls) | Order persists after refresh |
| TS-05-05 | Delete a step | Removed from list; autosaved |
| TS-05-06 | Mark step complete | Checkbox state persists |
| TS-05-07 | Edit title, wait for debounce, click **Cancel** | Reverts to page-open snapshot; navigates Home |
| TS-05-08 | **Mark complete** action | Task status → completed |
| TS-05-09 | **Archive** action | Task removed from active recommendation |
| TS-05-10 | Home hero after breakdown | Shows "Step 1 of N" preview |

**Automated:** `lib/tasks/steps.test.ts`, `lib/tasks/task-actions.test.ts`

---

### Part 06 — Focus session

**Proof:** [`proof/06-focus-session.proof.md`](proof/06-focus-session.proof.md)  
**IDs:** `FR-FOCUS-01`–`08`, `NFR-PERF-01`, `NFR-PERF-02`, `BC-UX-01`, `BC-UX-04`

| Step | Action | Pass criteria |
|------|--------|---------------|
| TS-06-01 | From Home: Start focus → pick preset | Session starts in ≤2 clicks from landing |
| TS-06-02 | Preset options | 2, 5, 15, 25 minutes available |
| TS-06-03 | Active session UI | Large current step, "X of Y", countdown, task title footer only |
| TS-06-04 | **Pause** | Timer stops; state persists |
| TS-06-05 | **+5 min** | Timer extends by 5 minutes |
| TS-06-06 | **End session** | Returns to celebration or Home |
| TS-06-07 | **Too hard? Shrink it** | First sub-step only + 2-minute mode |
| TS-06-08 | Mark step Done during session | Advances to next step; only current highlighted |
| TS-06-09 | Timer near end | No aggressive red flash (`BC-UX-01`) |
| TS-06-10 | Navigate away while paused, return | Resume prompt shown (`FR-FOCUS-06`) |
| TS-06-11 | Session start latency | Feels instant (< 1s from preset tap) |

**Automated:** `lib/focus/timer.test.ts`, `lib/focus/steps.test.ts`, `lib/focus/session-store.test.ts`

---

### Part 07 — Completion flow

**Proof:** [`proof/07-completion.proof.md`](proof/07-completion.proof.md)  
**IDs:** `FR-COMPLETE-01`–`03`

| Step | Action | Pass criteria |
|------|--------|---------------|
| TS-07-01 | Let timer reach zero (or end early) | Soft celebration; affirming copy; session duration shown |
| TS-07-02 | Celebration CTAs | "Keep going", "Take a break", "Done for now" present |
| TS-07-03 | Complete all steps during session | Offer to mark task complete |
| TS-07-04 | Finish session → Home | Micro recap minutes increased |

**Automated:** `lib/completion/record-session.test.ts`

---

### Part 08 — Today Home

**Proof:** [`proof/08-today-home.proof.md`](proof/08-today-home.proof.md)  
**IDs:** `FR-HOME-01`–`07`, `BC-UX-03`, `BC-UX-05`

| Step | Action | Pass criteria |
|------|--------|---------------|
| TS-08-01 | Open `/` with tasks | Time-aware greeting + hero card with recommended task |
| TS-08-02 | Hero card content | Title, first step preview, motivation (if set), primary CTA |
| TS-08-03 | Primary CTA count | Exactly **one** primary CTA on Home (`BC-UX-03`) |
| TS-08-04 | **Not today** (snooze) | Confirmation text; task hidden until tomorrow; no overdue styling |
| TS-08-05 | Empty state (no tasks) | Illustration + "Add your first task" onboarding |
| TS-08-06 | Micro recap strip | "Today: X min focused" reflects completed sessions |
| TS-08-07 | Multiple tasks | Recommendation follows priority (`FR-HOME-07`) |

**Automated:** `lib/tasks/recommendation.test.ts`, `lib/tasks/snooze-task.test.ts`

---

### Part 09 — Daily recap (P1)

**Proof:** [`proof/09-daily-recap.proof.md`](proof/09-daily-recap.proof.md)  
**IDs:** `FR-RECAP-01`–`03`

| Step | Action | Pass criteria |
|------|--------|---------------|
| TS-09-01 | Open `/recap` after sessions | Minutes focused, tasks touched, steps completed |
| TS-09-02 | Copy tone | Forgiving language; no red guilt metrics |
| TS-09-03 | Reflection tags | Single-tap toggle; `aria-pressed` state |
| TS-09-04 | Keyboard | Tags reachable and toggleable via keyboard |

**Automated:** `lib/recap/daily-recap.test.ts`

---

### Part 10 — Accessibility

**Proof:** [`proof/10-accessibility.proof.md`](proof/10-accessibility.proof.md)  
**IDs:** `NFR-A11Y-01`, `NFR-A11Y-02`, `NFR-A11Y-03`

| Step | Action | Pass criteria |
|------|--------|---------------|
| TS-10-01 | Skip-to-content | Activates main content on all shell routes + focus |
| TS-10-02 | Form labels | Quick add, title, motivation, energy tag all labeled |
| TS-10-03 | Focus session | Timer/progress announced (`aria-live`) |
| TS-10-04 | Reflection tags | Not color-only; `aria-pressed` |
| TS-10-05 | Keyboard-only navigation | Complete Flow A without mouse |
| TS-10-06 | `prefers-reduced-motion: reduce` | Non-essential animation disabled |
| TS-10-07 | Contrast spot-check | Text readable on hero, timer, buttons |

**Automated:** `lib/a11y/verification.test.ts` (copy + constraint checks)

---

### Part 11 — UX & brand constraints

**Proof:** [`proof/11-ux-brand-constraints.proof.md`](proof/11-ux-brand-constraints.proof.md)  
**IDs:** `BC-BRAND-01`, `BC-UX-01`–`05`, `BC-SCOPE-01`

| Step | Action | Pass criteria |
|------|--------|---------------|
| TS-11-01 | Read Home, focus, celebration, snooze copy | Warm tone; no guilt/hustle language |
| TS-11-02 | Snooze / pause / extend / abandon | No shame UI |
| TS-11-03 | Focus screen | Single task visible; no task list or badges |
| TS-11-04 | Home + focus preset picker | Max 1 primary CTA per screen |
| TS-11-05 | Scope audit | No login, accounts, AI breakdown, notifications |

**Automated:** `lib/a11y/verification.test.ts`

---

### Part 12 — Browser smoke

**Proof:** [`proof/12-browser-smoke.proof.md`](proof/12-browser-smoke.proof.md)  
**IDs:** `NFR-BROWSER-01`

Test in **latest** Chrome, Firefox, Safari, Edge:

| Step | Routes to open | Pass criteria |
|------|----------------|---------------|
| TS-12-01 | `/` | Renders; quick add works |
| TS-12-02 | `/tasks/new` | Capture works |
| TS-12-03 | `/tasks/[id]` | Detail + breakdown work |
| TS-12-04 | `/focus/[taskId]` | Preset + timer work |
| TS-12-05 | `/recap` | Stats display |

---

### Part 13 — End-to-end flows

**Proof:** [`proof/13-e2e-flows.proof.md`](proof/13-e2e-flows.proof.md)  
**Source:** [`docs/APP_SPEC.md`](../docs/APP_SPEC.md) §7

| Flow | Steps summary | Pass criteria |
|------|---------------|---------------|
| **A — First visit → first focus** | Empty Home → add task → breakdown → 5 min focus → celebration | Complete without confusion |
| **B — Low motivation** | Home → "Too hard? Shrink it" → 2 min on first step → continue prompt | Shrink path works |
| **C — Task breakdown** | Detail → add/reorder steps → focus advances steps | Step progress correct |
| **D — End of day** | Sessions → `/recap` → reflection tags | Forgiving summary |

---

### Part 14 — Demo acceptance

**Proof:** [`proof/14-demo-acceptance.proof.md`](proof/14-demo-acceptance.proof.md)  
**IDs:** `BC-DEMO-01`

| Step | Action | Pass criteria |
|------|--------|---------------|
| TS-14-01 | Record 1–2 min demo video | Shows product + agentic process mention |
| TS-14-02 | Live demo: 2–5 min session | User completes without confusion |
| TS-14-03 | UI feel | Calm during recording; no jarring red timer |

---

## 5. Automated test inventory

| Test file | Covers |
|-----------|--------|
| `app/routes.smoke.test.tsx` | Shell route renders |
| `lib/storage/storage.test.ts` | CRUD, persistence |
| `lib/tasks/create-task.test.ts` | Task creation |
| `lib/tasks/steps.test.ts` | Step add/reorder/delete |
| `lib/tasks/task-actions.test.ts` | Complete, archive, cancel |
| `lib/tasks/recommendation.test.ts` | Home recommendation priority |
| `lib/tasks/snooze-task.test.ts` | Snooze until tomorrow |
| `lib/focus/timer.test.ts` | Timer state machine |
| `lib/focus/steps.test.ts` | Focus step advancement |
| `lib/focus/session-store.test.ts` | Session serialize/resume |
| `lib/completion/record-session.test.ts` | Session recording, daily stats |
| `lib/recap/daily-recap.test.ts` | Recap aggregation |
| `lib/a11y/verification.test.ts` | Shame-free copy constraints |

---

## 6. Pass / fail rules

| Rule | Definition |
|------|------------|
| **Part pass** | All steps in that part's proof file marked Pass |
| **P0 MVP pass** | Parts 00–08, 10, 11, 13, 14 pass |
| **Full MVP pass** | All parts 00–14 pass (includes P1 recap) |
| **Blocker** | Any `BC-*` violation or `NFR-DX-01` failure blocks sign-off |
| **Evidence required** | Every failed step must have notes; every passed L3+ step needs screenshot or recording link |

---

## 7. Sign-off checklist

- [ ] All proof files in `validation/proof/` completed
- [ ] `validation/README.md` status table updated
- [ ] Demo video link recorded in `14-demo-acceptance.proof.md`
- [ ] Optional: sync summary into [`docs/verification.md`](../docs/verification.md)

---

*Created: 2026-07-10 · Traceable to `docs/requirements.md` MVP acceptance criteria*
