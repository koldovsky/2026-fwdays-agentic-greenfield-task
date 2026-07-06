# Current State

> Persistent handoff file for future agent windows. A quick map, not a
> replacement for source-of-truth artifacts. Always verify with OpenSpec,
> tests, and the repo.

## Last Updated

- **Date and time:** 2026-07-07, ~00:30 (Europe/Kyiv)
- **Current phase:** **Slice S3 `dashboard` COMPLETE and ARCHIVED — next is
  S4 `booking-hitl` ∥ S5 `kb-learning` (DAG fan-out).** Archived at
  `openspec/changes/archive/2026-07-06-dashboard/`. 2 human decisions
  (design.md): Bot→Next ingest→SSE publisher seam (thin injected publisher on
  the bot, no-op when unconfigured, regression-guarded so archived S2 is
  byte-for-byte unchanged); lean AG-UI/SSE client, no CopilotKit (advisory
  TC-PROTO-01 deviation, flagged to reflect back into requirements). Stages
  A–D red→green: `lib/src/dashboard` (hallSeatStatus/weekSeatGrid/
  applyJsonPatch) + `deleteLeadCascade`; AG-UI publisher seam + HttpAgui
  Publisher; ingest/SSE-stream/delete-lead/decision-stub Next routes + the
  AG-UI contract relocated to `lib/src/agui` (UI decoupled from the bot);
  tokens + components/ds + SSE client + page. **333 tests green**, lint + tsc
  (root + apps/dashboard) clean, dashboard builds, openspec 5/5 strict,
  traceability 0 failures, trajectory 0 failures.
  **Review-gate ran BEFORE archive** (3 reviewers, maker≠checker; guardrail
  check PASS — no confirm-booking/KB-write introduced): 7 confirmed findings
  fixed test-first (`00a1fcc`; incl. CRITICAL publisher-hang), 4 deferred to
  S4 with owner (all unreachable in S3: no live pending path), in the
  archived `review-findings.json` (clean:true).
  **Rendered-UI gate (Playwright — chrome-devtools MCP not connected):**
  axe **0 serious/critical light+dark** (3 real violations found+fixed:
  HallMap ARIA grid, `--text-muted` contrast, BoundedText focus); a fresh
  **vision-judge** confirmed FR-DASH-01+FR-DASH-03 MET (its 2 readability
  notes fixed: non-color seat cue solid/double/dashed+strikethrough,
  WCAG 1.4.1; brief clip). Evidence in `docs/qa/dashboard/` (stills+webm+
  manifest w/ vision verdict). **Scripted 8.11 smoke PASSED** (28/28,
  `scripts/qa/manual-smoke-dashboard.mjs`) over the real cross-process
  HTTP+SSE bridge — surfaced + fixed 2 real bugs: the bot entrypoint wouldn't
  start under plain `node` (HttpAguiPublisher TS parameter-property vs
  strip-only execution), and delete-lead 500'd without calendar creds
  (now lazy calendar-port resolution).
  **S4 owner-flagged carryovers (from review-findings):** make a newly-created
  pending request known to the dashboard aggregate (BOOKING_PENDING gate);
  idempotent calendar-delete across >1 pending booking; refresh
  `dashboard.hallMap` on live booking-status events (real-time seat flip);
  write `bookings.slot_start` as a Europe/Kyiv-offset ISO string (HallMap
  bucketing contract). The PR demo video is the user's to record.
- **Prior phase (archived):** **Slice S2 `intake` COMPLETE and ARCHIVED.** All 6 task sections done incl. 6.9 real-DB smoke PASSED and
  6.11 archive. 221 unit tests green, lint + build (tsc) clean, openspec 6/6
  strict, traceability 0 failures, trajectory 0 failures (review-findings
  clean). Live real-model 6.9 testing surfaced 3 bugs fakes could not (age
  re-ask `6b3dc35`; text-less-tool-call stall → code now owns the next
  question `d991a67`; amend-age-string wrongful soft_decline + explain_scope
  missing SCOPE_EXPLANATION_COPY `5fd6c42`), each fixed test-first before the
  smoke was allowed to pass. Two of those were the flip side of a review-gate
  fix (validateAge type-guard ↔ amend string coercion; pass_through outcome ↔
  explain_scope detour). Transport: the bot's model calls go through the
  **Claude Agent SDK / local `claude` CLI** (subscription auth), behind the
  unchanged `ModelPort` seam (`ClaudeAgentModelPort`); a subscription OAuth
  token 429s against the raw API. Deferred to S4: live slot proposal +
  real-calendar hold/awaiting_admin/cancel (propose_slots/request_hold are
  pass-through no-ops until the loop gets a CalendarPort seam); inline-button
  rendering; per-lead rate-limit → global hardening; a MINOR prompt-hardening
  item (under-4 self-narrated refusal bypassing the deterministic guardrail).
- **Prior phase (archived):** **Slice S1 `slots` COMPLETE and ARCHIVED**
  (`openspec/changes/archive/2026-07-04-slots/`, 44/44 tasks). Spike
  verdict: **googleapis** (MCP disqualified empirically — no
  service-account auth; evidence in packages/calendar/spike-mcp/).
  6.9 smoke scripted+passed (`scripts/qa/manual-smoke-slots.mjs`,
  transcript `docs/qa/slots-manual-smoke.md`). **Review-gate ran
  post-archive** (process deviation — run it BEFORE archive next time):
  12 confirmed + 3 contested findings, all fixed or dispositioned
  (review-findings.json in the archive dir); notable fixes: partial
  unique index on pending slots (TOCTOU backstop), dashboard pinned to
  127.0.0.1, key chmod 600, secret-scan patterns hardened.
  Gates: lint, 47/47 unit, 6/6 live integration, build, openspec 5/5
  strict, traceability 0 failures.
  S2 `intake` details are archived under
  `openspec/changes/archive/…-intake/` (proposal, design, tasks, and the
  dispositioned `review-findings.json`). Intake architecture landed:
  identity-only `leads` + full-profile `requests`; a pure `transition()`
  state machine (greeting→qualifying→profiling→collecting→proposing→
  awaiting_admin→done, soft_decline terminal); the model only extracts
  answers into tool calls while guardrails re-validate in code; a static
  system prompt (DESIGN.md voice + BC rules + FR-GUARD-01/05/FR-FAQ-02) plus
  a per-turn dynamic block; the CODE (not the model) deterministically asks
  the next question (`lib/intake/next-field.ts` + `questions.ts`,
  `loop.ts assembleReply`), because `ClaudeAgentModelPort`'s `canUseTool`
  aborts before the model narrates a follow-up. The agent still has NO
  confirm-booking / KB-write tool (FR-GUARD-01/06).
- **Open items before the PR:** eval cases fr-guard-03/fr-slot-03/04
  (eval-suite pass); tentative-hold calendar UI screenshot (QA-proof,
  chrome-devtools MCP); re-run security checklist when S3/S4 add routes.
- **Active change:** none (baseline specs, not a change folder)
- **Progress:** G0 loop (`e8b4952`); PRD hardening (`2527fde`); decisions:
  sonnet-5 + user token (`acc9e64`), musical identity (`c33157a`),
  Google Calendar ADR-0003 (`8c682f9`), MCP strategy (`94b71d4`); static
  context consolidated (`6694f89`); **G1 signed** (`720bded`). **Stack
  scaffold** (`ed149e8`): npm-workspaces monorepo (lib + bot/agent/db +
  Next 16 dashboard), gates green, **git hooks verified live** (first attempt
  correctly blocked: ESLint 10 vs eslint-config-next → pinned v9).
  **Phase 2 WIP** (`847aaef`): 5 baseline specs drafted + critiqued.
  ESLint-9 pin + handoff (`49bf591`). **Phase 2 (G2) DONE** (`c16975c`):
  spec-pipeline resumed from cache; revise pass applied (kb-learning 6,
  slots 7 incl. Europe/Kyiv timezone conventions); coverage check found
  3 gaps + 2 contradictions, all fixed (proposing = conversation state only,
  NFR-UX-01 → intake, delete-lead → dashboard, questions.delivery_status
  amended into ADR-0001 §4, actor unified to "administrator").
  Gate: `openspec validate --all --strict` 5/5; check-traceability 30 FRs,
  0 failures, 0 spec-mention warnings.
  **Phase 3** plan drafted (`c33ffad`) and **G3 SIGNED** (`85cf863`):
  5 slices, DAG S1 slots → S2 intake → S3 dashboard → {S4 booking-hitl ∥
  S5 kb-learning}; all 30 MVP FRs owned exactly once. **Phase 4 S1
  `slots`**: change folder (`7cd81c1` — proposal, design with CalendarPort
  googleapis-vs-MCP spike criteria, 44-task test-first tasks.md);
  check-traceability `@trace` regex fixed for categorized ids (`fe86ac1`);
  RED — 20 tests in 5 files + typed throwing stubs (`0266c48`; first
  commit attempt correctly blocked by the tsc pre-commit gate, fixed by
  typing, not weakening); GREEN — domain modules implemented (`5d13658`),
  20/20 pass, tests byte-identical, the compactness tie-break test caught
  a real implementer bug pre-review.
- **Next task:** **Slice S4 `booking-hitl` and/or S5 `kb-learning`** — the
  DAG's final fan-out (both depend on S1–S3, now all archived; S4 and S5 don't
  depend on each other). **S4** owns the admin decision transitions +
  DecisionBar POST handlers (the ONLY place `bookings.status → confirmed`,
  FR-GUARD-01), the real `propose_slots`/`request_hold` wiring to S1's
  proposeSlots/holdWithRecovery (so a conversation can actually reach
  `awaiting_admin`/`pending`), calendar sync on Confirm/Decline, and lead
  notifications — plus the four S3 carryovers flagged in the archived
  dashboard `review-findings.json` (pending-request-known-to-dashboard;
  idempotent calendar delete; real-time HallMap seat flip; Kyiv-offset
  `slot_start`). **S5** owns the Question inbox (FR-KB-*, FR-FAQ-*, FR-GUARD-02/06)
  on the conversation FAQ path + a dashboard inbox panel. Same discipline:
  OpenSpec change folder → test-first red→green → review-gate BEFORE archive →
  rendered-UI gate (axe + vision-verify) for any S5 UI. Model economy:
  subagent fan-outs on sonnet; session model only for main-loop judgment.
- **Open before the PR:** eval cases (eval-suite pass, `check-eval-ratchet`);
  the PR fills `.github/pull_request_template.md` (real name, 1–2 min demo
  video, human-vs-agent decisions, tools/MCP used); re-run the security
  checklist after S4/S5 add routes.

## Source Of Truth

1. `AGENTS.md` — project agent rules (CLAUDE.md is just `@AGENTS.md`).
2. `docs/current-state.md` — this handoff.
3. `docs/requirements.md` — canonical FR/NFR/TC/BC; G1-signed 2026-07-03.
4. `docs/product-brief.md` — product narrative.
5. `docs/mvp-capability-plan.md` — not written yet (Phase 3 artifact).
6. `openspec/project.md` + `openspec/specs/` — specs empty until Phase 2.
7. `docs/adr/` — ADR-0001 (local-first, AG-UI, guardrails-in-code; §4
   superseded), ADR-0002 (context architecture), ADR-0003 (Google Calendar
   slots, rankSlots, tentative holds, service account).
8. `docs/qa/` — traceability report (auto-generated by `check:trace`).

## OpenSpec Status

```bash
npx openspec validate --all --strict   # expected: 5 passed, 0 failed
npx openspec list                      # expected: No active changes
```

Archived changes: `2026-07-04-slots`, `2026-07-06-intake`,
`2026-07-06-dashboard` (under `openspec/changes/archive/`).

## Completed Changes

- **2026-07-04-slots** (S1) — deterministic slot grid, free-slot subtraction,
  `rankSlots()`, tentative holds, CalendarPort (googleapis).
- **2026-07-06-intake** (S2) — conversation state machine, validators,
  agent tool-loop, bot pipeline + `ClaudeAgentModelPort`, leads/requests
  schema. Baseline `openspec/specs/intake/spec.md` updated on archive.
- **2026-07-06-dashboard** (S3) — AG-UI/SSE transport (bot publisher seam →
  Next ingest → in-memory hub → SSE), lean AG-UI client, live conversation +
  request card + pending queue + DecisionBar (render-only), concert-hall
  HallMap, delete-lead cascade, localhost-only. Rendered-UI gated (axe
  light+dark + vision-judge). Baseline `openspec/specs/dashboard/spec.md`
  updated on archive.

## Validation Commands

```bash
node scripts/check-traceability.mjs    # 30 MVP FRs, 0 failures expected
npx openspec validate --all --strict
# The rest activate once the stack scaffold exists (Phase 4 pre-work):
npm run lint && npm run test:run && npm run build
```

Current test expectation: no app code yet; check-traceability is the only
live gate. **Git hooks note:** `pre-commit` runs `npx tsc --noEmit`, which
needs the TypeScript stack — until the scaffold lands, docs/infra commits use
`--no-verify` (see `e8b4952`); after the scaffold, run a verify-commit to
prove hooks fire.

## Environment / Deployment

- Fully local (NFR-LOCAL-01): Telegram long polling, dashboard on localhost;
  outbound only to Telegram, Anthropic, Google Calendar APIs.
- Secrets: `.env` = `TELEGRAM_BOT_TOKEN`, DEMO calendar id, path to gitignored
  Google service-account JSON; Anthropic auth via local user token — no API
  key on disk. Never print or commit secrets.
- Model: `claude-sonnet-5`. DEMO Google Calendar must be shared with the
  service account ("Make changes") before the slots slice can run live.
