# App Specification — TinyStart

> **Type:** Web application  
> **Status:** In development  
> **Last updated:** 2026-07-10  
> **Working name:** TinyStart *(rename freely before launch)*

---

## 1. Executive Summary

**TinyStart** is a web app that helps people with ADHD (and similar executive-function challenges) **start work**, **stay focused**, and **feel motivated** without guilt, overwhelm, or rigid productivity culture.

The product is built around three ideas:

1. **Make starting easy** — reduce activation energy with tiny commitments, task breakdown, and a single clear “next action.”
2. **Protect focus** — one-task-at-a-time UI, flexible focus sessions, and minimal distractions.
3. **Rebuild motivation gently** — connect tasks to personal meaning, celebrate small wins, and avoid shame-based streaks.

This document is the **source of truth for future development**. Features, flows, and scope decisions should reference this spec.

---

## 2. Problem Statement

People with ADHD often struggle with:

| Challenge | How it shows up |
|-----------|-----------------|
| **Task initiation** | Knowing what to do but being unable to start (“waiting mode”) |
| **Working memory overload** | Forgetting steps, context-switching, losing the thread |
| **Time blindness** | Underestimating duration, missing transitions |
| **Motivation gaps** | Tasks feel meaningless until urgency or interest appears |
| **Shame spirals** | Missed goals → self-criticism → even harder to start |

Most productivity tools assume consistent motivation, linear planning, and punishment for failure. **TinyStart does the opposite:** low friction, forgiving design, and ADHD-informed patterns.

---

## 3. Target Users

### Primary persona — **Alex, 28, knowledge worker**

- Diagnosed or self-identified ADHD
- Has a backlog of tasks but gets stuck at “open laptop → stare → scroll”
- Tried Todoist/Notion/Pomodoro; abandoned them because they felt rigid or guilt-inducing
- Wants something that helps **today**, not another system to maintain

### Secondary persona — **Sam, 22, student**

- Irregular schedule, high context switching
- Needs help breaking assignments into steps and doing “just 5 more minutes”
- Sensitive to cluttered UI and notification overload

### Non-goals (not primary audience for v1)

- Clinical treatment or diagnosis
- Full project-management replacement (Jira, Linear)
- Team collaboration / enterprise PM

---

## 4. Product Vision & Design Principles

### Vision

> *The gentlest path from “I can’t start” to “I’m already working.”*

### ADHD-informed design principles

| Principle | What it means in the product |
|-----------|------------------------------|
| **Low activation energy** | User can start a focus session in ≤2 clicks from landing |
| **Externalize memory** | Tasks, steps, and “why” are visible so the brain doesn’t have to hold them |
| **One thing at a time** | Default view shows a single active task; hide the rest |
| **Flexible, not punitive** | Pausing, extending, or abandoning a session has no shame UI |
| **Micro-wins matter** | Completing a 5-minute block counts; celebrate without being childish |
| **Interest bridge** | Optional “why this matters to me” field to reconnect dopamine |
| **Calm by default** | Minimal chrome, soft motion, no red “overdue” alarms in MVP |
| **Forgiving progress** | “Days you showed up” beats unbroken streaks |
| **Reduce decisions** | Smart default: “Here’s your best next task” on the home screen |

### Tone of voice

- Warm, direct, non-patronizing
- Examples: *“Ready for a tiny start?”* · *“5 minutes counts.”* · *“Paused — pick up whenever.”*
- Avoid: *“You failed”* · *“Be disciplined”* · *“Only X days left!”*

---

## 5. Core User Jobs

1. **“I need to start something, anything.”** → Quick capture + 2-minute / 5-minute starter mode
2. **“This task feels too big.”** → Break task into 3–7 small steps
3. **“I’ll forget why I care.”** → Attach a personal motivation note
4. **“I need to focus now.”** → Enter focus mode with timer + single task
5. **“Did I actually do anything today?”** → See gentle daily summary, not a guilt dashboard

---

## 6. Feature Scope

### MVP (course project — build this first)

Scope is intentionally small but **end-to-end usable**.

| Feature | Description | Priority |
|---------|-------------|----------|
| **Today Home** | One recommended next task + “Start focus” CTA | P0 |
| **Quick capture** | Add a task in one line; optional energy tag (low / medium / high) | P0 |
| **Task breakdown** | Split a task into ordered sub-steps (manual, 3–7 items) | P0 |
| **Motivation bridge** | Optional short text: “Why does this matter to me?” | P0 |
| **Focus session** | Full-screen focus view: one task/step, timer, pause/end | P0 |
| **Tiny start modes** | Presets: 2 min, 5 min, 15 min, 25 min (user can extend) | P0 |
| **Step-by-step focus** | During session, highlight current sub-step only | P0 |
| **Completion moment** | Soft celebration + “What’s next?” (continue / break / done for today) | P0 |
| **Local persistence** | `localStorage` (or IndexedDB) — no auth required for MVP | P0 |
| **Daily recap** | Simple count: tasks touched, minutes focused, micro-wins | P1 |

### V1 (post-MVP)

| Feature | Description |
|---------|-------------|
| **Energy check-in** | “How’s your brain right now?” → suggest task size/duration |
| **Body double timer** | Optional “virtual coworking” countdown with ambient presence copy |
| **Forgiving streaks** | “You showed up 4 of last 7 days” instead of breakable streak |
| **Task templates** | “Email”, “Study block”, “Chores” with pre-filled breakdown hints |
| **Focus sounds** | Optional lo-fi / white noise (muted by default) |
| **Export / backup** | JSON export of tasks and history |

### Future (out of MVP/V1 scope)

- Accounts & sync across devices
- AI-assisted task breakdown and “start script” generation
- Calendar integration
- Real-time body-doubling rooms
- Mobile PWA with offline-first sync
- Integrations (Notion, Google Tasks)

---

## 7. Key User Flows

### Flow A — First visit → first focus session

```
Land on Home → See empty state with “Add your first task”
→ Quick add task → (optional) Add why it matters
→ Prompt: “Break it down?” → Add 3 steps
→ Tap “Start 5 min” → Focus screen
→ Timer ends → Celebration → “Another 5?” or “Mark done”
```

### Flow B — Returning user, low motivation

```
Open app → Home shows “Best next task” (oldest untouched or user-pinned)
→ User feels resistance → Tap “Too hard? Shrink it”
→ App suggests first sub-step only + 2-min mode
→ Complete 2 min → Momentum prompt to continue
```

### Flow C — Task breakdown

```
Select task → Breakdown editor
→ Add steps (reorder, delete)
→ Save → Task card shows “Step 1 of N”
→ Focus mode advances step on “Done” or auto after checkbox
```

### Flow D — End of day

```
User opens recap (or sees banner after 3+ sessions)
→ “Today: 2 tasks touched, 35 min focused”
→ No red metrics; optional reflection: “What helped?” (single tap tags)
```

---

## 8. Information Architecture

```
/                     → Today Home (dashboard)
/tasks                → All tasks (simple list, optional for MVP)
/tasks/new            → Quick capture
/tasks/[id]           → Task detail + breakdown + motivation
/focus/[taskId]       → Active focus session (distraction-free)
/recap                → Daily / weekly gentle summary (P1)
/settings             → Timer defaults, theme, sounds (minimal)
```

**MVP navigation:** Home, Focus (contextual), Task detail. Skip full `/tasks` list if time-constrained — Home is enough.

---

## 9. Screen Inventory

### 9.1 Today Home

**Purpose:** Reduce choice; answer “What should I do now?”

**Elements:**
- Greeting (time-aware, short)
- **Hero card:** next recommended task
  - Title, first step preview, motivation snippet (if set)
  - Primary CTA: `Start focus`
  - Secondary: `Break down` · `Not today` (snooze)
- **Quick add** inline input
- **Micro recap strip:** “Today: X min focused”
- Empty state illustration + one-line onboarding

### 9.2 Task Detail

**Elements:**
- Task title (editable)
- Motivation bridge (optional textarea)
- Energy tag (low / med / high) — optional
- Sub-steps list (add, reorder, complete)
- Actions: `Start focus` · `Mark complete` · `Archive` · `Cancel`
- **Autosave:** 1200ms debounce on edits; title and motivation also save on blur; quiet "Saving…" / "Saved" indicator
- **Cancel:** reverts to the task snapshot from page open, cancels pending autosave, returns to Home

### 9.3 Focus Session (full-screen)

**Purpose:** Single-task immersion

**Elements:**
- Current step (large typography)
- Progress: step X of Y
- Timer (countdown, large, non-anxious styling)
- Controls: `Pause` · `+5 min` · `End session`
- Minimal footer: task title only
- **No** notification badges, side nav, or task list visible

**Behavior:**
- On end: play subtle completion state (no confetti overload)
- If all steps done → mark task complete option
- Paused state persists if user navigates away (resume prompt)

### 9.4 Completion Modal / Screen

- Affirming message (rotating copy pool)
- Stats: session duration
- CTAs: `Keep going` · `Take a break` · `Done for now`

### 9.5 Daily Recap (P1)

- Minutes focused, tasks touched, steps completed
- Forgiving language
- Optional: tag what helped (music, breakdown, tiny start, etc.)

---

## 10. UI / UX Guidelines

### Visual direction

- **Aesthetic:** Calm, warm, spacious — “quiet coworking cafe” not “gamified hustle”
- **Palette:** Soft neutrals + one accent (e.g. sage green or muted coral)
- **Typography:** Highly readable; large focus text during sessions
- **Motion:** Subtle; respect `prefers-reduced-motion`
- **Density:** Low — generous whitespace

### Accessibility (required)

- WCAG 2.1 AA contrast minimum
- Full keyboard navigation
- Screen reader labels for timer and progress
- No color-only state indicators
- Focus indicators visible

### ADHD-specific UX rules

- **Maximum 1 primary CTA** per screen
- **No infinite scroll** on task lists in MVP
- **Snooze / not today** without deleting tasks
- **Timer never flashes red** aggressively; optional gentle pulse near end
- **Autosave** everything — never lose a breakdown mid-edit; text fields debounce 1200ms and flush on blur; Cancel discards in-session edits

---

## 11. Technical Architecture

### Stack (aligned with current repo)

| Layer | Choice |
|-------|--------|
| Framework | **Next.js 16** (App Router) |
| UI | **React 19** + **Tailwind CSS 4** |
| Language | **TypeScript** |
| State | React state + URL for focus session; consider `zustand` if complexity grows |
| Persistence | `localStorage` for MVP; abstract behind `storage` module for swap to DB later |
| Deployment | Vercel (or static export if preferred) |

### Suggested folder structure

```
app/
  page.tsx                 # Today Home
  tasks/[id]/page.tsx      # Task detail
  focus/[taskId]/page.tsx  # Focus session
  recap/page.tsx           # Daily recap (P1)
components/
  tasks/                   # TaskCard, BreakdownEditor, QuickCapture
  focus/                   # FocusTimer, StepDisplay, SessionControls
  ui/                      # Button, Modal, etc.
lib/
  storage/                 # Persistence adapter
  tasks/                   # CRUD, recommendations
  focus/                   # Timer logic, session state
  types/                   # Task, Step, Session types
```

### Data persistence (MVP)

- No backend required
- All data client-side
- Export/import JSON in V1 for safety

---

## 12. Data Model

### Task

```ts
type EnergyLevel = "low" | "medium" | "high";

interface Task {
  id: string;
  title: string;
  motivation?: string;        // "Why this matters to me" — free-form, multi-word
  energy?: EnergyLevel;
  steps: TaskStep[];
  status: "active" | "completed" | "archived";
  snoozedUntil?: string;      // ISO date
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface TaskStep {
  id: string;
  title: string;
  completed: boolean;
  order: number;
}
```

### FocusSession

```ts
interface FocusSession {
  id: string;
  taskId: string;
  stepId?: string;            // current step
  plannedMinutes: number;
  startedAt: string;
  endedAt?: string;
  pausedMs: number;
  status: "active" | "paused" | "completed" | "abandoned";
}
```

### DailyStats (aggregated client-side)

```ts
interface DailyStats {
  date: string;               // YYYY-MM-DD
  minutesFocused: number;
  sessionsCompleted: number;
  tasksTouched: string[];
  stepsCompleted: number;
}
```

### Recommendation logic (MVP)

Priority order for “Best next task”:

1. Pinned task (if feature added) or last active
2. Active task with incomplete steps, lowest energy match (optional)
3. Oldest active task not snoozed
4. Empty → prompt quick capture

---

## 13. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Performance | First focus session start < 1s on mid-range laptop |
| Offline | Works offline after first load (PWA nice-to-have) |
| Privacy | No analytics requiring PII in MVP; data stays on device |
| Browser support | Latest Chrome, Firefox, Safari, Edge |
| Mobile web | Responsive; focus mode usable on phone |

---

## 14. Success Metrics

### Product (qualitative for course demo)

- User can go from landing → focus session in under 30 seconds
- User completes at least one 2–5 minute session without confusion
- UI feels calm in user testing (5-second test)

### Engineering (course evaluation)

- Spec-driven: features map to sections in this document
- Tests for core logic: task CRUD, recommendation, timer state machine
- `AGENTS.md` / rules guide agent implementation
- Demo video shows agentic workflow + working product

---

## 15. Out of Scope (MVP)

- User accounts, login, cloud sync
- Payments / subscriptions
- Clinical claims or ADHD diagnosis content
- Social features, leaderboards
- Complex recurring tasks / cron
- Native mobile apps
- Email/push notifications

---

## 16. Development Phases

### Phase 0 — Setup (done)

- [x] Next.js scaffold
- [x] Rename app, basic layout, design tokens (colors, typography)

### Phase 1 — Core loop (MVP)

- [x] Data types + localStorage layer
- [x] Quick capture + task list on Home
- [x] Task detail + manual breakdown
- [x] Focus session + timer presets
- [x] Completion flow

### Phase 2 — Polish

- [x] Recommendation engine for “next task” (full FR-HOME-07 priority)
- [x] Daily recap (`/recap`, FR-RECAP-01/02/03)
- [x] Empty states, micro-copy, accessibility pass (Home hero, greeting, snooze, micro recap)
- [x] A11y / perf / browser verification (`docs/verification.md`)
- [x] Unit tests for `lib/`

### Phase 3 — Demo & docs

- [x] README with setup + agentic practices notes
- [x] Demo capability map + Cursor slices ([`docs/demo-capabilities.md`](demo-capabilities.md))
- [ ] 1–2 min demo video (see demo-capabilities Demo Phases 2–3)
- [ ] PR with specification reference (see `demo-publish`)

---

## 17. Copy Bank (starter)

| Context | Example copy |
|---------|--------------|
| Empty home | “Nothing here yet. What’s one small thing you could start?” |
| Tiny start | “Just 2 minutes. You can stop after.” |
| Pause | “Paused. Your progress is saved.” |
| Complete | “You showed up. That counts.” |
| Snooze | “Not today — we’ll surface it tomorrow.” |
| Breakdown prompt | “Big tasks are hard to start. Want to split this into tiny steps?” |

---

## 18. Open Questions

| # | Question | Default if unresolved |
|---|----------|------------------------|
| 1 | Final app name? | Keep **TinyStart** as codename |
| 2 | Dark mode in MVP? | Yes, follow system preference |
| 3 | Sounds in MVP? | No — defer to V1 |
| 4 | AI breakdown in scope? | No for course MVP — manual only |
| 5 | Ukrainian localization? | English first; i18n structure optional |

---

## 19. Appendix — Competitive Notes

| App / pattern | What to borrow | What to avoid |
|---------------|----------------|---------------|
| Pomodoro timers | Time boxing | Rigid 25/5, guilt on skip |
| Todoist / Things | Clear task lists | Feature bloat, overdue shame |
| Forest / gamification | Positive reinforcement | Punitive “you killed the tree” |
| Focusmate | Body doubling | Mandatory scheduling complexity |
| Goblin Tools | Task breakdown | Not ADHD-specific focus loop |

**TinyStart’s wedge:** *start-first, single-task focus, motivation bridge, shame-free* — in one minimal web app.

---

## 20. Document Usage

When implementing with AI agents:

1. Reference this file in `AGENTS.md` as the product spec
2. Implement **MVP features only** unless explicitly expanding scope
3. Update this doc when scope changes (with date + changelog)
4. Use **maker ≠ checker**: one agent implements, another verifies against acceptance criteria below

### MVP Acceptance Criteria

- [x] User can create a task with title and optional motivation
- [x] User can add and reorder at least 3 sub-steps
- [x] User can start a focus session (2/5/15/25 min presets)
- [x] Focus view shows only current step and timer
- [x] User can pause, extend, and end a session
- [x] Completed sessions update daily minutes on Home
- [x] Data persists across browser refresh
- [x] App is responsive and keyboard-accessible

---

## 21. Changelog

| Date | Change |
|------|--------|
| 2026-07-10 | Added `docs/demo-capabilities.md` — Phase 3 demo slices for Cursor (environment → capture → narration → publish). |
| 2026-07-10 | Recap view fix: replaced uncached `useSyncExternalStore` with event-driven state (53 tests green). Requirements statuses updated to `shipped`. |
| 2026-07-10 | All OpenSpec slices shipped: daily recap (stats + reflection tags), a11y/perf verification doc, global focus-visible baseline. Phase 2 complete. |
| 2026-07-10 | Today Home polish: time-aware greeting, full hero card with Not today snooze, full FR-HOME-07 recommendation priority, last-active tracking. |
| 2026-07-10 | Phase 1 core loop complete: focus session (presets, pause/extend/end, shrink-it, resume) and completion flow (celebration CTAs, mark task complete, DailyStats writer, Home micro recap). MVP acceptance criteria fully checked. |
| 2026-07-10 | Phase checkboxes updated: Phase 0 complete; Phase 1 partial (storage, capture, task detail); Phase 2 partial (recommendation, unit tests). MVP acceptance criteria marked for shipped task flows and persistence. |
| 2026-07-10 | Task detail: motivation textarea preserves spaces while typing (`FR-MOTIVATION-01`); autosave uses 1200ms debounce with blur flush on title/motivation (`FR-TASK-04`); Cancel action reverts to page-open snapshot and returns Home (`FR-TASK-01`, `FR-TASK-07`). |

---

*End of specification*
