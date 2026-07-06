# Current State

> Persistent handoff file for future agent windows. A quick map, not a
> replacement for source-of-truth artifacts. Always verify with OpenSpec,
> tests, and the repo.

## Last Updated

- **Date and time:** 2026-07-04, ~04:15 (Europe/Kyiv)
- **Current phase:** **Slice S1 `slots` COMPLETE and ARCHIVED**
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
- **S2 `intake`: sections 1–6.8 DONE; ONE step left (6.9, needs the
  user).** Sections 1–5 red→green (schema; state machine + validators;
  agent tool-loop; bot pipeline + AnthropicModelPort + entrypoint wiring;
  runtime import-extension fix so the real bot loads under plain Node).
  **Review-gate ran BEFORE archive** (S1 lesson): 18 confirmed findings,
  all dispositioned in `openspec/changes/intake/review-findings.json`
  (clean:true) — 7 fixed test-first (CRITICAL amend-validator bypass,
  age type-guard, callback enum crash, error boundary, system-prompt +
  DESIGN.md voice + addressesParent context, log label), 4 deferred with
  owners (propose/hold real wiring + button rendering + stale-callback →
  S4; rate-limit → hardening). 173 tests green, lint, openspec 6/6
  strict, traceability 0 failures. Checker fix: `testDirs` now includes
  `packages`.
  **Transport pivot (user-directed): the bot's model calls go through the
  Claude Agent SDK, not the raw API.** A subscription Claude Code OAuth
  token (`CLAUDE_CODE_OAUTH_TOKEN`) authenticates against the raw API but
  is instantly rate-limited (429) — proven by the AnthropicModelPort
  smoke. New `ClaudeAgentModelPort` (`packages/agent/src/claude-agent-
  model-port.ts`) spawns the local `claude` CLI (subscription allowance),
  behind the SAME `ModelPort` interface so loop.ts/pipeline.ts are
  untouched. `canUseTool` captures the model's proposed tool_use, denies +
  aborts (nothing executes). Wired as production in index.ts;
  AnthropicModelPort kept for API-key deployments. `ensureAmbientAuthToken`
  bridges CLAUDE_CODE_OAUTH_TOKEN→ANTHROPIC_AUTH_TOKEN. **Proven live by an
  automated smoke**: 'Доньку звати Софійка' → save_name via the CLI, no
  429. RISK: CLI-spawn latency ~5–12s/turn vs NFR-UX-01 p90≤5s (warm-
  subprocess follow-up flagged). 187 unit green; integration 4 passed +
  1 skipped (Anthropic smoke, no API key here).
  **Remaining: 6.9 manual smoke — IN PROGRESS with the user.** The real
  bot is running (long polling, Agent-SDK model); user is walking a live
  Telegram chat (happy path age 9, age-3 refusal, piano detour, amend,
  cancel, returning lead). Note: live slot proposal is deferred to S4, so
  the flow collects the full profile then stops before proposing. After
  the chat: capture transcript/DB evidence to `docs/qa/intake-manual-
  smoke.md`, then 6.10 archive. Bot start: `node packages/bot/src/index.ts`.
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
- **Next task:** `slots` tasks.md remaining sections: 1 (bookings schema
  seed), **4 (CalendarPort + googleapis-vs-MCP spike — BLOCKED: needs the
  user to create the DEMO Google Calendar, a service account, share the
  calendar with it, and put the JSON key path + calendar id in `.env`)**,
  5 (NFR-REL-01 failure paths + real-calendar integration smoke), 6
  (validation cadence; archive only after real smoke). Then slice S2
  `intake`. Model economy: subagent fan-outs on sonnet; Fable only for
  main-loop judgment (user directive).

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
npx openspec validate --all --strict   # expected: pass (nothing authored yet)
npx openspec list                      # expected: No active changes
```

Archived changes: none.

## Completed Changes

None yet — Phase 2 (baseline specs) is next; per-slice change folders start in
Phase 4a.

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
