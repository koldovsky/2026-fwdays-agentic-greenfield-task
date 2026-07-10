# Demo Capabilities — TinyStart (Cursor workflow)

Last updated: 2026-07-10

This document splits **Phase 3 — Demo & docs** ([`APP_SPEC.md`](APP_SPEC.md) §16) into **demo capabilities** — bounded slices you execute in **Cursor** (agent prompts, verification, maker ≠ checker) before recording a **1–2 minute** course submission video.

Refer to [`requirements.md`](requirements.md) (`BC-DEMO-01`), [`verification.md`](verification.md), [`openspec-capabilities.md`](openspec-capabilities.md) (product capabilities shown on screen), and [`README.md`](../README.md) (homework submission).

---

## Course deliverable

| Item | Source | Status |
|------|--------|--------|
| 1–2 min demo video (product + agentic process) | `README.md` homework | pending |
| PR with name, video link, agentic practices description | `README.md` homework | pending |
| Spec reference in PR | `APP_SPEC.md` §16 Phase 3 | pending |

**Video time budget (total ≤ 120 s):**

| Segment | Budget | Capability |
|---------|--------|------------|
| Product walkthrough | 60–75 s | `demo-capture-*` (slices 2–6) |
| Agentic engineering explanation | 30–45 s | `demo-narration-agentic` |
| Optional hook / outro | 5–10 s | `demo-script` |

---

## Markers

| Marker | Meaning | Cursor use |
|--------|---------|------------|
| `(demo-capability \`name\`)` | Bounded demo slice | One agent session or one recording take |
| `P0` | Must ship before recording | Block recording until green |
| `P1` | Nice-to-have polish | Trim/edit only; not blocking |

---

## Capability inventory

### 0. `demo-environment` — `(demo-capability \`demo-environment\`, **P0**)`

**Goal:** reproducible recording environment; verification gate green.

| IDs | Check |
|-----|-------|
| NFR-DX-01 | `npm run lint && npm run typecheck && npm test && npm run build` passes |
| NFR-BROWSER-01 | Chrome (primary recorder browser) smoke-tested |
| BC-DEMO-01 | Rehearsal completes 2–5 min flow without confusion |
| FR-STORAGE-01 | Clean `localStorage` for fresh empty Home |

**Cursor agent prompt (copy-paste):**

```
Run the NFR-DX-01 gate. Fix any failures. Then start production server
(npm run build && npm start) and list the exact URL + routes I should
open for demo recording: /, /tasks/[id], /focus/[taskId], /recap.
Do not change product behavior — environment only.
```

**Definition of done:**

- [ ] All gate commands exit 0
- [ ] App served at `http://localhost:3000` (production build preferred)
- [ ] Browser: DevTools → Application → **Clear site data** (or private window)
- [ ] macOS Do Not Disturb on; viewport 1280×800 or 1440×900
- [ ] Rehearsal completed once end-to-end

**Depends on:** product Phases 0–2 shipped (all `openspec-capabilities.md` changes #1–9)  
**Blocks:** all `demo-capture-*` slices

---

### 1. `demo-script` — `(demo-capability \`demo-script\`, **P0**)`

**Goal:** fixed demo data and click path so recording is repeatable.

| Product IDs shown | Screen |
|-------------------|--------|
| FR-HOME-04, FR-CAPTURE-01 | Empty Home → quick-add |
| FR-TASK-02, FR-MOTIVATION-01, FR-TASK-04 | Task detail → breakdown + motivation |
| FR-TASK-05, FR-HOME-02 | Home hero "Step 1 of N" |
| FR-FOCUS-01, FR-FOCUS-04, FR-FOCUS-05, FR-FOCUS-07 | Focus session |
| FR-COMPLETE-01, FR-COMPLETE-03 | Completion + Home micro recap |
| FR-RECAP-01, FR-RECAP-02, FR-RECAP-03 | Daily recap |

**Canonical demo data (do not improvise on camera):**

| Field | Value |
|-------|-------|
| Task title | `Draft project README` |
| Motivation | `Ship the course assignment on time` |
| Step 1 | `Open outline` |
| Step 2 | `Write setup section` |
| Step 3 | `Add demo video link` |
| Focus preset | **2 min** (`FR-FOCUS-01`) |
| Timer strategy | Run ~10 s live → **End session** → jump-cut in edit |
| Recap reflection tag | `Breakdown` or `Tiny start` |

**Cursor agent prompt:**

```
Read docs/demo-capabilities.md slice demo-script and docs/APP_SPEC.md §7 Flow A.
Produce a click-by-click rehearsal checklist with estimated seconds per step,
totaling ≤75s for the product segment. Reference FR-* IDs per step.
```

**Definition of done:**

- [ ] Script printed or second monitor visible during recording
- [ ] One dry run timed ≤ 90 s (product only)
- [ ] No out-of-scope features mentioned (accounts, AI breakdown, guilt metrics)

**Depends on:** `demo-environment`  
**Blocks:** `demo-capture-*`

---

### 2. `demo-capture-quick-start` — `(demo-capability \`demo-capture-quick-start\`, **P0**)`

**Maps to product capabilities:** `quick-capture`, `today-home` (empty state)

| IDs | On-screen proof |
|-----|-----------------|
| FR-HOME-04 | Empty state illustration + onboarding line |
| FR-CAPTURE-01, FR-HOME-03 | Quick-add from Home |
| FR-CAPTURE-02 | *(optional)* energy tag — skip if over budget |

**Recording slice (~12–15 s):**

```
GIVEN empty Home (cleared storage)
WHEN I type "Draft project README" and submit quick-add
THEN I land on /tasks/[id] with the title visible
```

**Cursor role:** rehearse route; agent does **not** record — you screen-capture.

**DoD:** [ ] Single take; calm pacing; no keyboard fumbling

---

### 3. `demo-capture-breakdown` — `(demo-capability \`demo-capture-breakdown\`, **P0**)`

**Maps to product capabilities:** `task-breakdown`, `motivation-bridge`

| IDs | On-screen proof |
|-----|-----------------|
| FR-TASK-02 | 3 ordered sub-steps added |
| FR-MOTIVATION-01 | Motivation textarea filled |
| FR-TASK-04 | Autosave (no manual Save button) |

**Recording slice (~15–18 s):**

```
GIVEN task detail for "Draft project README"
WHEN I add 3 steps and a motivation line
THEN breakdown list shows Step 1–3; navigate Home shows hero preview
```

**DoD:** [ ] "Step 1 of 3" visible on Home hero (`FR-TASK-05`)

---

### 4. `demo-capture-focus` — `(demo-capability \`demo-capture-focus\`, **P0**)`

**Maps to product capabilities:** `focus-session`

| IDs | On-screen proof |
|-----|-----------------|
| FR-FOCUS-08 | Start focus in ≤2 clicks from Home |
| FR-FOCUS-01 | 2 min preset selected |
| FR-FOCUS-04 | Full-screen step + timer |
| FR-FOCUS-05 | Pause / +5 min / End visible |
| FR-FOCUS-07 | Mark current step done |
| BC-UX-01 | No aggressive red timer |

**Recording slice (~18–22 s):**

```
GIVEN Home with recommended task
WHEN I tap Start focus → 2 min → mark step 1 done
THEN focus view shows step 2 of 3 and countdown running
```

**Timer note:** End session after ~10 s of live timer; cut wait in post (`demo-publish`).

**DoD:** [ ] Focus mode feels distraction-free (`BC-UX-04`)

---

### 5. `demo-capture-completion` — `(demo-capability \`demo-capture-completion\`, **P0**)`

**Maps to product capabilities:** `completion`, `today-home` (micro recap)

| IDs | On-screen proof |
|-----|-----------------|
| FR-COMPLETE-01 | Celebration copy + duration |
| FR-COMPLETE-03, FR-HOME-06 | Home micro recap "Today: X min focused" |

**Recording slice (~12–15 s):**

```
GIVEN active focus session
WHEN I tap End session → Take a break (or Done for now)
THEN celebration appears; Home shows updated micro recap strip
```

**DoD:** [ ] Affirming copy visible (`BC-BRAND-01`); no guilt language

---

### 6. `demo-capture-recap` — `(demo-capability \`demo-capture-recap\`, **P0**)`

**Maps to product capabilities:** `daily-recap` (P1)

| IDs | On-screen proof |
|-----|-----------------|
| FR-RECAP-01 | Minutes, tasks touched, steps completed |
| FR-RECAP-02 | Forgiving tone; no red metrics |
| FR-RECAP-03 | One reflection tag toggled |

**Recording slice (~10–12 s):**

```
GIVEN session just completed
WHEN I open /recap via nav
THEN stats reflect today's session; I tap one reflection tag
```

**DoD:** [ ] Direct nav only (no "banner after 3+ sessions" — out of scope)

---

### 7. `demo-narration-agentic` — `(demo-capability \`demo-narration-agentic\`, **P0**)`

**Goal:** satisfy homework requirement — explain **how** you built with agents.

**Artifacts to mention (pick 4–5 in ~35 s):**

| Practice | Evidence in repo |
|----------|------------------|
| Specification-Driven Development | `docs/requirements.md` (`FR-*`, `BC-*`) |
| Capability slicing | `docs/openspec-capabilities.md` + phase order |
| Context engineering | `AGENTS.md`, `CLAUDE.md`, Vercel React skill |
| Verification / loops | `npm test`, `docs/verification.md`, NFR-DX-01 |
| Maker ≠ checker | separate review pass / CodeRabbit on PR |
| Scope discipline | `BC-SCOPE-01`, MVP out-of-scope in `requirements.md` |

**Cursor agent prompt (for PR text + voiceover script):**

```
Read AGENTS.md, docs/openspec-capabilities.md, and README.md homework section.
Draft a 35-second voiceover script explaining which agentic practices I used,
what I decided vs what the agent implemented, and which MCP/tools I used.
Cite real files in this repo. Tone: concise, first person.
```

**Definition of done:**

- [ ] Voiceover recorded (over product B-roll or split-screen spec files)
- [ ] PR description draft ready (same content, expanded)
- [ ] Honest split: **you** = scope, product tone, acceptance; **agent** = slice implementation

**Depends on:** `demo-script`  
**Can parallel:** record after product slices exist (use separate audio take)

---

### 8. `demo-publish` — `(demo-capability \`demo-publish\`, **P0**)`

**Goal:** upload video + open PR.

| Tool | Role |
|------|------|
| macOS `Cmd+Shift+5` or QuickTime | Screen capture (primary) |
| iMovie / DaVinci Resolve (**P1**) | Trim timer wait; cap at 2:00 |
| Loom / YouTube unlisted | Hosting + shareable link |

**Edit checklist:**

- [ ] Total duration ≤ 2:00
- [ ] Product segment shows all 5 flow steps (create → recap)
- [ ] Agentic segment names ≥3 practices with repo evidence
- [ ] No secrets, `.env`, or personal data on screen

**Cursor agent prompt:**

```
Draft my PR description for the fwdays homework template:
- real name placeholder
- demo video URL placeholder
- bullet list of agentic practices with file references
- test plan checklist from docs/verification.md
```

**Depends on:** all `demo-capture-*`, `demo-narration-agentic`  
**Blocks:** course submission

---

## Implementation order (phases)

Use this order in Cursor — one capability per agent session where possible (loop engineering).

```
┌─────────────────────────────────────────────────────────────┐
│ Demo Phase 0 — Gate (before any recording)                  │
│  1. demo-environment    NFR-DX-01 green, prod server,       │
│                         clean storage, rehearsal slot         │
├─────────────────────────────────────────────────────────────┤
│ Demo Phase 1 — Script (Cursor-assisted)                     │
│  2. demo-script         fixed task/steps, timing, FR map    │
├─────────────────────────────────────────────────────────────┤
│ Demo Phase 2 — Product capture (you record; agent rehearsed)  │
│  3. demo-capture-quick-start   empty Home → task            │
│  4. demo-capture-breakdown     steps + motivation           │
│  5. demo-capture-focus         preset → step advance        │
│  6. demo-capture-completion    celebration → micro recap    │
│  7. demo-capture-recap         /recap + reflection tag      │
├─────────────────────────────────────────────────────────────┤
│ Demo Phase 3 — Narration & edit                             │
│  8. demo-narration-agentic   voiceover + PR draft           │
│  9. demo-publish             trim, upload, PR link          │
└─────────────────────────────────────────────────────────────┘
```

**Rules:**

1. Do **not** start Demo Phase 2 until `demo-environment` DoD is complete.
2. Each `demo-capture-*` slice maps 1:1 to a product flow segment in `APP_SPEC.md` §7 Flow A + Flow D.
3. Agent implements **scripts and PR text**; **you** perform screen recording (Cursor is not a recorder).
4. Maker ≠ checker: after recording, second Cursor pass — *"Verify my demo hits BC-DEMO-01 and lists every FR-* shown in demo-script."*

---

## Demo acceptance → capabilities

| Criterion | Capability |
|-----------|------------|
| User completes 2–5 min session without confusion | `demo-capture-focus` + rehearsal in `demo-environment` |
| UI feels calm during recording | All `demo-capture-*` (respect `BC-UX-*`) |
| Video shows agentic workflow + working product | `demo-narration-agentic` + `demo-capture-*` |
| Homework PR complete | `demo-publish` |

---

## Cursor session map

| # | Open in Cursor | Mode | Outcome |
|---|----------------|------|---------|
| 1 | `demo-environment` | Agent | Green gate + prod URL |
| 2 | `demo-script` | Agent | Rehearsal checklist |
| 3 | Rehearsal | You (browser) | Dry run timed |
| 4 | `demo-capture-*` | You (screen record) | 5 raw clips or one take |
| 5 | `demo-narration-agentic` | Agent | Voiceover + PR body |
| 6 | Maker ≠ checker | Agent (review) | FR/BC coverage audit |
| 7 | `demo-publish` | You + Agent | Final video URL + PR |

---

## Suggested recording tools

| Priority | Tool | Why |
|----------|------|-----|
| 1 | macOS built-in (`Cmd+Shift+5`) | Zero setup; sufficient for course |
| 2 | QuickTime | Same quality; easy crop |
| 3 | OBS | 1080p + mic mix if voiceover live |
| 4 | Loom | Instant share link for PR |

**Cursor** is used for **spec compliance, scripts, PR text, and verification** — not for capturing pixels.

---

## MVP demo checklist (sign-off)

- [ ] `demo-environment` — gate green, clean storage, prod server
- [ ] `demo-script` — canonical task data, timed dry run
- [ ] `demo-capture-quick-start` — create task from empty Home
- [ ] `demo-capture-breakdown` — 3 steps + motivation
- [ ] `demo-capture-focus` — 2 min preset, step advance
- [ ] `demo-capture-completion` — celebration + micro recap
- [ ] `demo-capture-recap` — stats + reflection tag
- [ ] `demo-narration-agentic` — ≥3 agentic practices on camera or voice
- [ ] `demo-publish` — video ≤2 min, PR opened with link

---

*Derived from `docs/APP_SPEC.md` §16 Phase 3, `docs/requirements.md` `BC-DEMO-01`, and course `README.md`.*
