# Current State

> Persistent handoff file for future agent windows. A quick map, not a
> replacement for source-of-truth artifacts. Always verify with OpenSpec,
> tests, and the repo.

## Last Updated

- **Date and time:** 2026-07-06, ~19:40 (Europe/Kyiv)
- **Current phase:** **Slice S3 `dashboard` CODE-COMPLETE + REVIEW-GATED;
  archive tail remaining.** OpenSpec change `openspec/changes/dashboard/`
  (2 human decisions in design.md: Bot→Next ingest→SSE publisher seam;
  lean AG-UI/SSE client, no CopilotKit). Stages A–D done red→green
  (lib core + deleteLeadCascade; AG-UI publisher seam on the bot,
  regression-guarded no-op; ingest/SSE-stream/delete-lead/decision-stub
  routes; UI tokens+components/ds+SSE-client+page). **332 tests green**,
  lint + tsc (root + apps/dashboard) clean, dashboard builds, openspec 6/6.
  **Review-gate ran BEFORE archive** (3 reviewers, maker≠checker; guardrail
  check PASS): 7 confirmed findings fixed test-first (`00a1fcc` — CRITICAL
  publisher-hang; conversation-panel snapshot seeding; STATE_DELTA
  unknown-thread guard; json-patch proto-pollution; ingest/delete input
  validation; +DashboardApp reconnect/dedup tests), 4 deferred to S4 with
  owner (all unreachable in S3: no live pending path), in
  `openspec/changes/dashboard/review-findings.json` (clean:true).
  **REMAINING before archive (Stage E + F, tasks §7–8):** Playwright stills
  (empty + populated) + axe light+dark + a fresh vision-judge on the settled
  populated still + recording manifest; the scripted manual real-DB smoke
  (`scripts/qa/manual-smoke-dashboard.mjs`, drive pipeline→HttpAguiPublisher
  →running dashboard SSE, assert receipt + DB); then `npx openspec archive
  dashboard --yes` + post-archive gates. chrome-devtools MCP is NOT connected
  this session → use Playwright (browsers cached; declare @playwright/test +
  @axe-core/playwright per task 1.3). The PR demo video is the user's.
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
- **Next task:** **Slice S3 `dashboard`** (Phase 4). Author its OpenSpec
  change folder (proposal/design/tasks), then test-first red→green:
  teacher-facing localhost dashboard, AG-UI over SSE (RUN_STARTED/FINISHED,
  TEXT_MESSAGE_*, STATE_SNAPSHOT/DELTA, custom BOOKING_PENDING → DecisionBar),
  FR-DASH-01 + FR-DASH-03 (week schedule as concert-hall HallMap per
  DESIGN.md). Gate the RENDERED UI with axe (`check-a11y`, light+dark) AND a
  vision pass (`vision-verify`), per the correctness rules. Run the
  review-gate BEFORE archive (S1/S2 lesson). Model economy: subagent
  fan-outs on sonnet; session model (Opus/Fable) only for main-loop
  judgment (user directive).

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

Archived changes: `2026-07-04-slots`, `2026-07-06-intake`
(under `openspec/changes/archive/`).

## Completed Changes

- **2026-07-04-slots** (S1) — deterministic slot grid, free-slot subtraction,
  `rankSlots()`, tentative holds, CalendarPort (googleapis).
- **2026-07-06-intake** (S2) — conversation state machine, validators,
  agent tool-loop, bot pipeline + `ClaudeAgentModelPort`, leads/requests
  schema. Baseline `openspec/specs/intake/spec.md` updated on archive.

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
