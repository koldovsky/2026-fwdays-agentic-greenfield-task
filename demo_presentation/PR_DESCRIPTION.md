# Pull Request — fwdays Agentic Engineering Homework

## Name

**[Your real name here]**

## Demo video

**[Link to 1–2 min demo video — e.g. Loom / YouTube unlisted]**

Local recording artifact: `demo_presentation/tinystart-demo.mp4` — **fully agent-generated** (Playwright + macOS TTS + ffmpeg via `npm run demo:video`).

---

## Summary

**TinyStart** is a calm, ADHD-informed focus web app: quick capture → task breakdown → distraction-free focus sessions → gentle completion and daily recap. Built spec-driven with Cursor agents on **Next.js 16 + React 19 + TypeScript + Tailwind CSS 4**, device-local `localStorage` only.

**Core routes:** `/` · `/tasks/[id]` · `/focus/[taskId]` · `/recap`

---

## Agentic Engineering practices

### 1. Specification-Driven Development (SDD)

- **Source of truth:** `docs/requirements.md` — all `FR-*`, `NFR-*`, `BC-*`, `TC-*` IDs
- **Product spec:** `docs/APP_SPEC.md` (flows §7, screens §9, data model §12)
- **Visual spec:** `docs/design.md` (tokens, calm light theme)
- **Conflict rule:** documented in `AGENTS.md` — behavior from requirements, visuals from design

### 2. Capability slicing & loop engineering

- Implementation order: `docs/openspec-capabilities.md` (changes #1–9: shell → storage → capture → breakdown → focus → completion → recap)
- Demo slices: `docs/demo-capabilities.md` (environment → script → capture → narration → publish)
- One bounded agent session per capability instead of monolithic prompts

### 3. Context engineering

- `AGENTS.md` + `CLAUDE.md` — agent rules, spec hierarchy, MVP scope guardrails
- `.agents/skills/vercel-react-best-practices/` — React/Next performance patterns (e.g. `localStorage` schema)
- **Context7 MCP** — fresh Next.js / library docs during implementation

### 4. Verification & quality gate

- **NFR-DX-01:** `npm run lint && npm run typecheck && npm test && npm run build`
- **TC-STACK-05:** unit tests under `lib/` (focus timer, storage, recap, task actions)
- **UI validation:** `validation/run-ui-validation.mjs` + `validation/TEST_SPEC.md`
- Evidence: `validation/proof/`, `validation/evidence/screenshots/`

### 5. Maker ≠ checker

- Separate review pass against `docs/verification.md` and MVP acceptance criteria in `requirements.md`
- CodeRabbit on PR (course template)
- Demo audit: verify every `FR-*` shown in `demo_presentation/REHEARSAL_CHECKLIST.md` hits `BC-DEMO-01`

---

## What I decided vs what the agent implemented

| I decided | Agent implemented |
|-----------|-------------------|
| MVP scope, P0 before P1 (`BC-SCOPE-01`) | Route scaffold, `lib/storage`, UI components per openspec order |
| Shame-free tone, one primary CTA (`BC-BRAND-01`, `BC-UX-02`) | Copy from `APP_SPEC.md` §17, component layout from `design.md` |
| Canonical demo task data & timing | `demo_presentation/REHEARSAL_CHECKLIST.md`, Playwright recorder |
| Acceptance criteria & FR-ID traceability | Tests, validation runner, proof markdown |
| PR narrative & homework submission | This description + voiceover script |

---

## Test plan

- [ ] `npm run lint && npm run typecheck && npm test && npm run build` — all pass
- [ ] Empty Home → quick-add → task detail (`FR-CAPTURE-01`)
- [ ] Breakdown + motivation autosave (`FR-TASK-02`, `FR-MOTIVATION-01`, `FR-TASK-04`)
- [ ] Start focus ≤2 clicks, 2 min preset, step advance (`FR-FOCUS-01`, `FR-FOCUS-07`, `FR-FOCUS-08`)
- [ ] Completion celebration + micro recap (`FR-COMPLETE-01`, `FR-HOME-06`)
- [ ] Daily recap stats + reflection tag (`FR-RECAP-01`–`FR-RECAP-03`)
- [ ] Demo video ≤ 2:00; agentic segment names ≥3 practices with repo paths
- [ ] No secrets or `.env` on screen

---

## Spec reference

- `docs/APP_SPEC.md` §16 Phase 3 (Demo & docs)
- `docs/demo-capabilities.md`
- `docs/requirements.md` — `BC-DEMO-01`
