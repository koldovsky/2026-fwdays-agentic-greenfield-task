<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:design-system-rules -->
# WEG3D Fin Design System  

Invoice Maker uses the **WEG3D Fin** light theme. Read `Design.md` before changing UI.

## Quick reference

| Concern | Location |
| --- | --- |
| **Agent skill (UI workflow)** | `.agents/skills/weg3d-fin-design/SKILL.md` |
| Full design docs | `Design.md` |
| Runtime CSS tokens | `src/styles/design-tokens.css` |
| Theme + Tailwind mapping | `src/app/globals.css` |
| Status badge mappings | `src/lib/design-system.ts` |
| Visual gallery | `docs/Design System/Canvas.dc.html` |
| Design handoff tokens | `docs/Design System/design-tokens.css` |

## Rules for agents

1. **Light theme by default** — do not add `dark` to `<html>` unless explicitly requested.
2. **No raw hex in components** — use shadcn semantic tokens (`primary`, `muted-foreground`, …) or Tailwind `wf-*` colors (`text-wf-text-2`, `bg-wf-surface-2`).
3. **Typography** — page titles: `wf-display`; field labels: `wf-label`; money/amounts: `wf-mono`.
4. **Controls** — buttons and inputs target **36px** height (`h-9`); base radius **8px**.
5. **Primary actions** — `<Button>` default variant (brand red `#ef4136`).
6. **Invoice statuses** — use `<InvoiceStatusBadge status="…" />` from `@/components/invoices/invoice-status-badge`.
7. **Invoice preview surfaces** — use `wf-doc` or `wf-panel` utility classes.
8. **Token changes** — edit `src/styles/design-tokens.css` first; mirror to `docs/Design System/design-tokens.css` if the handoff file must stay in sync.
9. **UI work** — invoke `.agents/skills/weg3d-fin-design`; on activation, post the 🎨 session banner from that skill before other output.

## Fonts

Geist Sans and Geist Mono are loaded in `src/app/layout.tsx` via `next/font/google`. CSS variables: `--font-geist-sans`, `--font-geist-mono`.
<!-- END:design-system-rules -->

<!-- BEGIN:openspec-rules -->
# OpenSpec (Spec-Driven Development)

Invoice Maker uses **OpenSpec** for feature planning and living specifications.
**Read `openspec/specs/<capability>/spec.md` first** for behavior; use this
file for agent rules and UI conventions.

## Quick reference

| Concern | Location |
| --- | --- |
| **Session handoff (read first)** | `docs/current-state.md` |
| **Authoritative specs (read first)** | `openspec/specs/<capability>/spec.md` |
| **Capability map (order + deps)** | `docs/capability.md` |
| **Capability detail (expanded)** | `docs/capabilities/<id>.md` |
| **Capability gates (machine)** | `openspec/capability-map.yaml` (`npm run capability:check`) |
| OpenSpec config + injected context | `openspec/config.yaml` |
| In-flight changes | `openspec/changes/<change-name>/` |
| Numbered FR traceability | `docs/requirements.md` |
| Product narrative | `docs/product-brief.md` |
| Architecture (browser-first MVP) | `docs/ARCHITECTURE.md` |
| ADR (current stack) | `docs/adr/0002-browser-first-mvp.md` |
| Domain glossary | `CONTEXT.md` |
| Decisions tracker | `.scratch/mvp-spec-coherence/map.md` |

## Workflow (Cursor)

Use slash commands for the SDD loop:

1. **`/opsx:propose <change-name>`** — create a change (proposal, delta specs, design, tasks)
2. **`/opsx:explore`** — think through ideas without implementing
3. **`/opsx:apply`** — implement tasks from the active change
4. **`/opsx:sync`** — merge delta specs into `openspec/specs/` after implementation
5. **`/opsx:archive`** — archive a completed change

CLI equivalents: `openspec new change <name>`, `openspec status`, `openspec list`.

## Rules for agents

1. **Read handoff first** — open `docs/current-state.md`, then specs for the active capability.
2. **Read specs first** — before changing behavior, check `openspec/specs/` for the relevant capability. If empty (brownfield), infer from code and `docs/requirements.md`, then capture in a change.
3. **Respect capability gates** — run `npm run capability:check -- --capability <id>` before starting work; if blocked, finish dependencies and mark them `shipped` in `openspec/capability-map.yaml`.
4. **Non-trivial features go through a change** — use `openspec/changes/` for proposal → design → tasks → delta specs before coding.
5. **Respect existing agent rules** — `AGENTS.md` design-system and Next.js rules still apply during `/opsx:apply`.
6. **Use domain language** — terms from `CONTEXT.md` (Invoice, Client, LineItem, statuses).
7. **Archive when done** — after tasks are complete and verified, run `/opsx:sync` then `/opsx:archive`.
8. **Update handoff** — before ending a session, update `docs/current-state.md` (see docs-rules below).
<!-- END:openspec-rules -->

<!-- BEGIN:docs-rules -->
# Project documentation (`docs/`)

Invoice Maker keeps **human-readable project docs** in `docs/`. Use them for
context, traceability, and session continuity. They complement — but do not
replace — OpenSpec specs in `openspec/specs/`.

## Quick reference

| Concern | Location | When to read |
| --- | --- | --- |
| **Session handoff (read first)** | `docs/current-state.md` | Start of every agent session |
| **Numbered requirements (FR/NFR/TC/BC)** | `docs/requirements.md` | Before implementing or changing behavior |
| **Product narrative & workflows** | `docs/product-brief.md` | When you need *why* and end-to-end flows |
| **Runtime architecture** | `docs/ARCHITECTURE.md` | Before structural or stack changes |
| **ADR (current stack)** | `docs/adr/0002-browser-first-mvp.md` | When a decision conflicts with training data |
| **Original discovery notes (UA)** | `docs/research.md` | Deep domain context; not translated |
| **Invoice document layout** | `docs/invoice-template.html` | PDF/HTML output work |
| **NACE 2.1-UA reference** | `docs/191_2025.pdf` | NACE catalog and service descriptions |
| **Domain glossary** | `CONTEXT.md` (repo root) | Naming and terminology |

## Authority order

When documents disagree, follow this precedence:

1. `openspec/specs/<capability>/spec.md` — authoritative behavior
2. `docs/requirements.md` — numbered IDs and capability ownership
3. `docs/product-brief.md` — business narrative (may lag; never overrides specs)
4. `docs/research.md` — historical discovery; some items are Future / out of MVP

## `docs/requirements.md`

The **traceability index** for the project. Every requirement has a stable ID
(`FR-*`, `NFR-*`, `TC-*`, `BC-*`) and exactly one owning capability.

**Use it to:**

- Find which capability owns a feature before coding
- Check implementation order and slice gates (with `openspec/capability-map.yaml`)
- Reference FR IDs in OpenSpec proposals, tasks, and PR descriptions
- Confirm status (`proposed` · `accepted` · `shipped` · `dropped`)

**Do not** treat requirements.md as the runtime spec — behavior details live in
`openspec/specs/`. Update requirements.md when IDs, ownership, or status change;
update the matching `spec.md` when behavior changes.

## `docs/product-brief.md`

The **business narrative** behind the requirements: who the product is for, pain
points, end-to-end usage, key workflows in prose, NACE context, and out-of-scope
boundaries.

**Use it to:**

- Understand user intent and workflow before designing UI or flows
- Onboard quickly without reading every FR line
- Align copy and UX with the intended sole-entrepreneur (FOP) audience

**Do not** implement features mentioned only in the brief if they are marked
out of scope in `requirements.md` or settled as Future in `openspec/config.yaml`
(e.g. chat/LLM input in MVP).

## `docs/current-state.md` — agent session handoff

A **living handoff log** so any agent (or human) can resume work without
re-deriving context from git history or chat transcripts.

### Read at session start

1. Open `docs/current-state.md` **before** exploring the codebase or starting tasks.
2. Note: active slice/capability, last completed work, blockers, and **Next up**.
3. Cross-check with `openspec/capability-map.yaml` and any active change in
   `openspec/changes/`.

### Update at session end (or when stopping mid-task)

Append or revise `docs/current-state.md` with:

| Field | What to record |
| --- | --- |
| **Last updated** | ISO date-time and agent/session identifier if known |
| **Active capability / change** | e.g. `shell`, `add-nace-catalog`, or `none` |
| **Slice / gate** | Current slice (S0–S6) and `npm run capability:check` result if run |
| **Completed this session** | Bullet list of shipped tasks, files touched, specs synced |
| **Stopped at** | Exact step if work was interrupted (task id, failing test, open PR) |
| **Blockers** | Dependencies, missing decisions, CI failures, needs human input |
| **Next up** | Concrete first action for the next session |
| **Session log** | Append-only short entries (date, action, outcome) for history |

Keep entries **factual and concise**. Prefer pointers (`openspec/changes/foo/`,
commit hash, FR ID) over pasting large diffs.

### Rules

1. **Never delete history** — move stale items to a `## Session log` section; do
   not overwrite prior sessions without a trace.
2. **Update when pausing** — if the user stops mid-task or context is running
   out, write `Stopped at` and `Next up` before ending.
3. **Sync with OpenSpec** — when a capability ships, reflect it in
   `capability-map.yaml` *and* `current-state.md`.
4. **Do not commit secrets** — no API keys, personal ФОП/bank data, or tokens.
<!-- END:docs-rules -->

<!-- BEGIN-FACTORY-LESSONS -->

## Factory lessons (managed region)

These blocks are installed and upserted by `project-factory`. Each is keyed by a
lesson id; edits inside a block are preserved across re-installs. Do not add
hand-written content between the region markers.

<!-- BEGIN-LESSON-vacuous-pass-not-earned -->
### Lesson: a PASS over zero evidence is NOT-EARNED (vacuous-pass-not-earned, v1)

- Never report a gate or check as PASS when its evidence scope is 0 ("Scope: 0
  clip(s)", empty archive, no eval results) while product code exists under
  `app/`, `src/`, `lib/`, `server/`, or `packages/`. Render it **NOT-EARNED**
  and exit non-zero.
- Before product code exists, an empty scope is **SKIP-pending**: print it
  explicitly; it is visible and never counted as PASS.
- Never fold SKIP / 0-scope results into an overall "Pass" summary
  (`qa-verify`, `gate-status`). Field evidence: `worst()` folded SKIP into
  PASS and G4–G8 rendered green over literally nothing
  (2026-07-02-pixel-perfect-forensics.md, RC2).
<!-- END-LESSON-vacuous-pass-not-earned -->

<!-- BEGIN-LESSON-declared-method-needs-mechanism -->
### Lesson: a declared acceptance method needs an executable mechanism (declared-method-needs-mechanism, v1)

- Every FR/NFR that declares a verification method (pixel-diff, e2e,
  recording, a11y, eval, ...) must resolve to a real, executable, non-stub
  mechanism BEFORE the build phase starts: an installed check script, or a
  package.json script whose body does not match
  `/^echo |^true$|not yet configured/i`.
- A spec file that restates the requirement is NOT a mechanism. Field
  evidence: NFR-19 encoded "≥ 99% pixel match" while no pixel-diff tool
  existed anywhere and `test:e2e` was an echo stub exiting 0
  (2026-07-02-pixel-perfect-forensics.md, RC1).
- If a declared method has no mechanism, do not proceed: implement the check,
  or record an explicit human waiver — never let the declaration float
  unverifiable into the build.
<!-- END-LESSON-declared-method-needs-mechanism -->

<!-- BEGIN-LESSON-done-claims-need-evidence -->
### Lesson: done-claims need evidence pointers (done-claims-need-evidence, v1)

- Never write strong completion language ("Convergence reached", "all gates
  pass", "verification-only", "Overall result: Pass", "ready for release /
  sign-off", "done", "complete") into current-state.md, PR bodies, or handoff
  docs unless the same line carries a resolvable evidence pointer — a path
  that exists on disk (e.g. `docs/qa/automated-verification-latest.md`) and
  is fresh — or an explicit "Scope NOT delivered" section.
- The verdict belongs to exit-coded checks, not narrative. Field evidence:
  "Convergence reached … verification-only" was written while the same file
  admitted the formal acceptance was never run
  (2026-07-02-pixel-perfect-forensics.md, RC6).
- When you catch an unbacked claim, treat it as a correction event: file it,
  do not silently rewrite it.
<!-- END-LESSON-done-claims-need-evidence -->

<!-- BEGIN-LESSON-sampling-blindness -->
### Lesson: verified samples are never continuum coverage (sampling-blindness, v1)

- Any check that samples a CONTINUOUS space (viewport width, the element set,
  a single measurement channel) must **declare its sampling dimension** and the
  sample points — and must never report `coverage: continuum` / "100%" / "all
  widths" from a discrete sample set. Coverage from N samples is `sampled`.
- Every sampled check must carry a **stricter-instrument escalation path**: the
  finer instrument that runs before a definition-of-done is claimed or when any
  sample lands near the floor (5-width matrix → fine-step continuum pixel sweep;
  geometry-only channel → pixel channel over the same sweep; fixed element
  matrix → full computed-style diff).
- Field evidence (abstractly, the multi-layer parity campaign): the SAME
  blindness recurred three times — the element matrix, the width matrix, and a
  geometry-only sweep that read 0 divergence bands while 100+ below-floor pixel
  residuals sat between its samples
  (2026-07-02-pixel-perfect-forensics.md + follow-on parity work).
<!-- END-LESSON-sampling-blindness -->

<!-- BEGIN-LESSON-block-conquest-doctrine -->
### Lesson: per-block definition-of-done beats page-average (block-conquest-doctrine, v1)

- Drive visual parity **block by block to a per-block definition-of-done**, not
  by chasing a page-average score. A block is done only when, independently:
  `unpaired = 0`, `geometry = 0`, `paint = 0`, `asset = 0`, and `pixel >= floor`.
  The page is done only when EVERY block is done.
- The full-page pixel scalar is **telemetry, not the gate** — a high average
  launders per-block debt (one block regresses as another improves and the mean
  barely moves). Field evidence: the campaign demoted the full-page scalar
  (~0.9449 desktop) to telemetry and made acceptance per-section overlay
  (2026-07-02-pixel-perfect-forensics.md + follow-on parity work).
- Use the **overlay / onion-skin feedback pattern** to converge each block: a
  difference-blend overlay plus a 50% onion-skin composite of the block on both
  sites, reviewed by eye/vision, localizes the residual so it can be taken to
  zero before conquering the next block.
<!-- END-LESSON-block-conquest-doctrine -->

<!-- BEGIN-LESSON-capture-determinism -->
### Lesson: neutralize the capture before trusting it (capture-determinism, v1)

- A parity capture is trustworthy only after every known non-determinism source
  is neutralized. A same-input re-capture must be byte-stable; an unstable
  capture is a HARNESS defect (file it), never a product parity finding.
- The gotchas ledger — check each before treating a below-floor sample as real:
  1. **Carousel free-run timers** survive `autoplay.stop` — clear the timers,
     not just the flag, or the slide advances mid-shot.
  2. **Sub-pixel clip origin** ghosts the raster — snap clip origin to integer.
  3. **`captureBeyondViewport`** duplicates `position:fixed` chrome down the
     page — disable it when fixed chrome is present.
  4. **Lazy third-party widgets** come back blank under fast capture — settle /
     render-gate them on BOTH sites first.
  5. **In-context persistence probes** (localStorage/cookies/state) leak between
     captures — clear persistence so each shot is context-independent.
- Field evidence (abstractly): a fresh sweep over-counted by 100+ samples plus
  phantom geometry bands purely because a lazy live widget rendered blank under
  the fast path (2026-07-02-pixel-perfect-forensics.md + follow-on parity work).
<!-- END-LESSON-capture-determinism -->

<!-- END-FACTORY-LESSONS -->
