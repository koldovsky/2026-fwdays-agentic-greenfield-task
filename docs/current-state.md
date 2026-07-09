# Current State

> Persistent handoff file for future agent windows. A quick map, not a
> replacement for source-of-truth artifacts. Always verify with OpenSpec,
> tests, and the repo.

## Last Updated

- **Date and time:** 2026-07-10, ~night (Europe/Kyiv)
- **Post-archive product change + fixes (2026-07-10):** continued live Telegram
  testing drove an approved product change and a batch of runtime fixes, each
  test-first, all committed on `feat/music-school-agent`. **(1) 5-step
  mandatory-only intake** (spec + code): `profiling` (goal/tastes/experience)
  dropped; flow is name+age → format → weekdays+time → propose → pick, with
  name+age and weekdays+time asked as one merged step each; FR-INTAKE-03/04/05
  marked Dropped in `requirements.md`; intake spec updated. **(2)
  ClaudeAgentModelPort now captures ALL tool_use blocks** from one assistant
  turn (was: first-only + abort) — the enabler for merged multi-field
  extraction and adaptive "save whatever the lead gave". **(3) Intake reply
  fixes:** terse/partial answers saved immediately (no re-ask); merged question
  asks only the still-missing half of a pair; open preference («будь-який
  день») accepted → propose across all weekdays / full day; `assembleReply`
  drops model narration on pure-save turns (killed within-bubble double
  questions). **(4) slots past-time cutoff** — `proposeSlots` takes `now` and
  treats the past as busy, so a started slot is never offered. **(5) dashboard:**
  `agui-hub` moved to `globalThis` (Next 16 split ingest/stream into separate
  module graphs → live "Розмови" feed was dead); pending card now shows the
  booked day/time banner + a collapsible "Листування з лідом" that lazy-loads
  the persisted transcript (new `GET /api/requests/:id/messages` +
  `findMessagesForRequest`); `next.config.ts` loads the repo-root `.env` and
  absolutizes `GOOGLE_APPLICATION_CREDENTIALS` so `npm run dev` reaches the
  calendar without manual env (fixed "Не вдалося передати рішення"). All cadence
  green after each commit. **Still open:** the intake OpenSpec CHANGE folder was
  not re-created for the 5-step refactor (edited the baseline spec directly);
  the new `intake-flow` eval dimension is not yet ratcheted into
  `quality/eval-baseline.json` (run `eval-suite`); a direct admin→lead chat /
  agent co-pilot was discussed and is explicitly OUT of scope (would need a new
  FR). The security review's IDOR flag on the transcript route is acknowledged
  as N/A under the single-teacher localhost model (documented in the route).
- **Post-archive live-testing bug-fix session (2026-07-09):** a human ran the
  real bot end-to-end in Telegram for the demo and hit real conversational
  defects that no fake-model test could surface — all traced to the production
  `ClaudeAgentModelPort` (Agent-SDK/`claude`-CLI boundary) and one flow gap.
  **Five root-cause fixes, each test-first (RED→GREEN) and verified on the live
  model (`claude-sonnet-5`):**
  (1) **Terse-answer instructions** (`lib/src/intake/next-field.ts`) — a bare
  «Саша»/«груповий» in a collect state now saves the field instead of the model
  re-greeting; mirrors the age instruction's existing precedent to name/format/
  goal/tastes. `Refs: FR-INTAKE-01`.
  (2) **Conversation history** (new `messages` table + `packages/db/src/messages.ts`;
  `loop.ts` gains optional `history`; `pipeline.ts` persists each free-text turn
  and replays the tail) — fixes the experienceComfort loop where a lead answers a
  two-fact field one fact per turn and the model, context-free, re-asked forever.
  `messages.request_id` is `ON DELETE CASCADE` so a lead delete still wipes the
  transcript (NFR-PRIV-02). `Slice: conversation-history`.
  (3) **Transcript prompt** (`buildAgentPrompt` in `claude-agent-model-port.ts`) —
  the port used to send ONLY the latest user text (so history #2 never reached the
  model) AND passed a raw `/stats`/`/start` that the `claude` CLI ran as a slash
  command ("responds with some code"). Now a role-labelled `Лід:/Школа:` transcript:
  the model sees context and the prompt never starts with `/`.
  (4) **Nested MCP schema** (`mcp-tool-schema.ts`) — `jsonSchemaToZodRawShape`
  degraded `type:"array"`/`"object"` to `z.any()`, so through the production port
  `propose_slots`' `weekdays`/`timeWindow` were untyped and the model passed raw
  Ukrainian text → `validatePreferences` rejected EVERY propose → slots never
  appeared. Now translated recursively; the model emits `weekdays:["Wed"]`,
  `timeWindow:{start,end}` and propose applies.
  (5) **Auto-propose on profile completion** (`pipeline.ts` + `SLOTS_OFFER_COPY`)
  — the turn that collected the last field entered `proposing` but only called the
  save tool, dead-ending on the "we'll come back" closing copy. The pipeline now
  runs one more agent turn on entering `proposing` (empty message; the model
  proposes) and sends the ranked slot chips with a slot-offer copy instead.
  **State after session: 577 unit tests green** (+15 this session), lint/build
  clean, `openspec validate --all --strict` 5/5, traceability 0 failures. New eval
  cases in `evals/cases/fr-intake-01.eval.ts` (dimension `intake-flow`, not yet
  ratcheted into `quality/eval-baseline.json` — run the `eval-suite` workflow to
  establish that baseline). The `intake` OpenSpec spec was NOT re-opened for these
  fixes (post-archive bug fixes to existing capabilities); consider a follow-up
  spec touch-up if the conversation-history/auto-propose behavior should be pinned
  as a requirement. MVP history (all 5 slices, archived) below is unchanged.
- **Current phase:** **Slice S5 `kb-learning` COMPLETE and ARCHIVED
  (`openspec/changes/archive/2026-07-07-kb-learning/`) — the FINAL MVP slice.
  ALL 5 MVP SLICES DONE, the signed Phase 3 DAG is CLOSED, all 30 MVP FRs
  implemented.** Archived on the user's explicit direction after a full
  autonomous verification pass (562 unit + 10 integration + 5 scripted smokes
  incl. real-DEMO-calendar slots/booking-hitl + 28 live-model intake +
  real-on-disk-SQLite J.11 kb-learning, all green) — the real-DB smoke archive
  gate is satisfied by the scripted J.11. **Honest note:** unlike S4, the
  *interactive* live-Telegram walk-through (a human playing the lead end-to-end
  through the real bot + live model + real Telegram delivery) was NOT
  human-performed this session; it remains the user's for the 1–2 min demo
  video (steps documented in `docs/qa/kb-learning-manual-smoke.md`). The final
  MVP slice (Question inbox / FAQ path). Change folder
  `openspec/changes/kb-learning/` (proposal/design[5 decisions]/tasks/spec-delta),
  5 design decisions: 3 human-approved forks (manual retry ≠ S4 auto-retry; FR-GUARD-02
  structural+eval not runtime parser; self-fetch inbox no live push) + 2 agent defaults
  (KB read fresh per turn; lib/src/kb pure). Stages, each RED→GREEN test-first
  maker≠checker, committed on `feat/music-school-agent`: A questions table+queries
  (`18e2b88`); B pure lib/src/kb validate+serialize (`06a5ce8`); C FAQ tools
  answer_faq/log_question + KB-in-context + loop/pipeline wiring (`e1de469`); D bot
  answer-delivery drain manual-retry-only (`8d8fc11`); E dashboard Question-inbox panel
  + GET/answer/retry routes + seeded knowledge/school.md (`dd482a0`); F full-loop
  integration + KAMERTON_KB_PATH read seam (`d8d55fc`).
  **Review gate ran BEFORE archive (2 reviewers, maker≠checker): guardrail PASS**
  (FR-GUARD-06 structural — only kb-write.ts writes the KB; tools carry only
  `question`; findDeliverableQuestions never selects failed). 5 findings all fixed
  test-first (`626079e`): CRITICAL KB-poisoning (question spliced raw into the "## "
  heading → flattenQuestionToOneLine); CRITICAL answered+pending showed a live answer
  form → isSending "⏳ надсилається…" branch; MAJOR retry never refetched; MAJOR
  wrong (calendar) apology for a QuestionsPort failure → QUESTION_LOGGING_UNAVAILABLE_
  APOLOGY; MINOR readQuestionInput guard. `review-findings.json` clean:true (`38e2411`).
  **Stage H evals (live claude-sonnet-5, fresh eval-judge, `6780c23`):** fr-guard-02
  (9 cases) + fr-faq-01/02 (3) — ALL PASS; no invented number/term, correct tool
  routing, Ukrainian throughout. Ratchet: guardrail-integrity 91→91.7, faq-grounding
  new 96.7 (`quality/eval-baseline.json`). **The live eval caught + fixed (test-first,
  `0cc3bfc`) TWO CRITICAL production defects no fake could — the headline maker≠checker
  /verify-live evidence:** (1) ClaudeAgentModelPort.send() dropped the model's text on
  tool-call turns → a lead asking any FAQ got a BLANK Telegram message (masked until S5
  because prior turns' replies were deterministically overridden); (2) the Agent SDK
  subprocess loaded ambient global skills/plugins/hooks → the `using-superpowers`
  skill's "Using [skill]…" announcement leaked as the ENTIRE reply → fixed with
  `settingSources:[]` + `skills:[]` (verified against bundled sdk.d.ts@0.3.201).
  **Stage G rendered-UI gate (`15ba7bf`):** axe 0 violations light+dark; fresh
  vision-judge overallVerdict MET 0-blocking on 8 stills (3 inbox states distinct
  without color-only); `docs/qa/kb-learning/`. **Stage J.11 scripted smoke authored+
  PASSED** (`scripts/qa/manual-smoke-kb-learning.mjs`, transcript
  `docs/qa/kb-learning-manual-smoke.md`): all 8 autonomous steps over a real on-disk
  SQLite + tmp KB, rerunnable, never mutates the committed KB.
  **FINAL AUTONOMOUS STATE: 562 unit + 10 integration green, root+dashboard
  tsc/lint/build clean, openspec 6/6 strict, traceability 0 failures, eval ratchet
  91.7/96.7, a11y 0 violations, recordings 18/0, trajectory 4 slices 0 failures,
  review-findings clean:true, tree clean (after J-prep commit).**
  **ARCHIVED** (`npx openspec archive kb-learning --yes` — the 8 baseline
  requirements applied to `openspec/specs/kb-learning/spec.md`; the one MODIFIED
  delta scenario re just-answered/not-yet-delivered inbox visibility folded in).
  **Only remaining for the grade:** the 1–2 min PR demo video (the user's; walk
  the live Telegram FAQ→inbox→answer→delivery loop) + the already-filled
  `.github/pull_request_template.md` (author spelling + video link).
  History of the (now-archived) S4 build below.
- **Prior phase — Slice S4 `booking-hitl` COMPLETE and ARCHIVED**
  (`openspec/changes/archive/2026-07-07-booking-hitl/`, HEAD `dd20629`; 6
  MODIFIED requirements incl. the auto-retry-only amendment applied to the
  baseline). No active changes; openspec 5/5 strict; traceability 0 failures;
  trajectory 4 slices 0 failures. Human G.3 half confirmed live (all Telegram
  Confirm/Decline/Propose messages arrived). **Only remaining for S4's grade:
  the 1–2 min PR demo video (the user's) + fill `.github/pull_request_template.md`.
  Next MVP slice: S5 `kb-learning` (Question inbox) — the DAG's last node.**
  History of the (now-archived) build below.
  Change folder `openspec/changes/booking-hitl/` authored+committed (`2d4f2df`);
  design.md has 6 decisions incl. the LOCKED notification-outbox. Stages, each
  RED→GREEN test-first with maker≠checker, all committed on
  `feat/music-school-agent`: A pure `lib/src/booking` (transitions/validate-
  admin-slots/validate-preferences/copy + `isSlotOnGrid` + offer_slots/pick_slot
  intake events + releaseHold 404/410-idempotency) `f42aafc`/`c87611d`; B DB
  (notifications outbox + `ensureRequestsOfferedSlotsColumn` + insertBooking
  request_id + findBookingsByRequestId + offered_slots) `92e3a95`/`f9c3519`;
  C lead-side propose/hold wiring (SlotsPort/HoldStorePort new narrow LoopPorts,
  BookingStorePort untouched, `slot:<n>` callback → pending booking + BOOKING_
  PENDING) `09716fd`/`b5b5d11`; D real decision route (9-step, calendar-before-
  DB, deletes via releaseHold) `9823645`/`b799884`; E drain timer (3s interval,
  fire-and-forget) `2d1150c`/`1eecaea`; F 4 S3 carryovers (ingest STATE_SNAPSHOT
  republish + leads-route→releaseHold + Kyiv slot_start pin) `5f9d2d6`/`379455b`;
  G integration full-flow (3 round trips, real route+pipeline+drain over one
  SQLite) `0ca2569`. **445 unit + 9 integration green, root+dashboard tsc clean,
  openspec 6/6, traceability 0 failures.**
  **Review gate ran BEFORE archive (3 reviewers, maker≠checker): FR-GUARD-01
  PASS** (structurally verified — only the decision route writes `'confirmed'`;
  agent has no confirm/calendar tool; `packages/agent` never imports CalendarPort;
  BookingStorePort cancel-only). Confirmed findings being fixed test-first:
  (MAJOR) Confirm self-collision used raw string-equality vs Google's echoed
  freebusy format → compare by parsed instant; (MAJOR) drain setInterval
  re-entry → duplicate sends → in-flight guard; (MAJOR) propose_another_time
  DB commit not transactional → wrap in db.transaction; (MAJOR) delete-lead
  orphaned confirmed bookings' calendar PII (S4 introduced confirmed events) →
  broaden leads-route delete to all non-null calendar_event_id via releaseHold;
  (MAJOR) SLOT_UNAVAILABLE must name the slot; (MINOR) cap admin slots array;
  (MINOR) propose self-slot self-exclude. Docable/accepted: no retry ceiling,
  double-tap, ingest rate-limit, lead-delete drops undelivered notifications
  (NFR-PRIV-02 > NFR-REL-01 in that intersection).
  **3 LOCKED human decisions (2026-07-07):** (1) BUILD the DecisionBar
  slot-picker now (propose-another-time was API-only — no slot-selection UI);
  (2) delivery-failure = AUTO-RETRY-ONLY — amend the spec scenario + design.md
  Decision 1 to drop the manual "administrator can retry" card clause (the
  outbox already auto-retries every tick, satisfying recorded/never-dropped);
  (3) ATTEMPT the live gates now (.env has TELEGRAM_BOT_TOKEN, GOOGLE_APPLICATION
  _CREDENTIALS, GOOGLE_CALENDAR_ID, CLAUDE_CODE_OAUTH_TOKEN; playwright present;
  demo video is the user's).
  **DONE since:** all 7 review fixes RED→GREEN (`0c162a4`/`d3c30ac`); slot-picker
  UI RED→GREEN (`35a93ff`/`ec96cea`, incl. a deliberately-retargeted obsolete
  test); auto-retry-only spec/design amendment (`8ad6d99`); review-findings.json
  clean:true (`8db0abf`); **I rendered-UI gate PASSED** (`c8edfef`/`de990f3`):
  axe 0 serious/critical light+dark AND a fresh vision-judge verdict MET/0-blocking
  on the DecisionBar + slot-picker + HallMap stills — this gate CAUGHT A
  PRODUCTION-FATAL BUG (DashboardApp client-imported `currentWeekStartIso` from
  dashboard-db.ts whose top-level `node:url` side effect white-screened every
  browser render; vitest/tsc/next-build all missed it — fixed by a Node-free
  `apps/dashboard/lib/current-week.ts`) + 1 axe dark-contrast fix. **463 unit +
  9 integration green, root+dashboard tsc/lint/build clean, openspec 6/6,
  traceability 0 failures, check-recordings 10/0.** QA harness:
  scripts/qa/{seed,capture,a11y}-booking-hitl.mjs; evidence docs/qa/booking-hitl/.
  **DONE (autonomous gates all complete):** H.2/H.3 `evals/cases/fr-guard-01`
  (`bd734ff`): produce() drives a live claude-sonnet-5 turn under lead pressure;
  fresh eval-judge scored **91/pass**; ratchet baseline `quality/eval-baseline.json`
  guardrail-integrity=91 (`check:eval` OK). **G.3 AUTONOMOUS subset + LIVE-VERIFIED**
  (`5fd1765`→`c3017b9`): scripts/qa/manual-smoke-booking-hitl.mjs runs the calendar
  sync on all 3 decisions + outbox drain + off-grid + a PERMANENT gating exact-
  overlap Confirm regression, all against the REAL DEMO calendar, 0 stray events.
  **The G.3 live smoke found a real Confirm double-booking the fakes couldn't**
  (Google freebusy.query MERGES coincident events → an external event exactly
  overlapping the own hold was masked). Fixed across two layers, RED→GREEN + live-
  verified: (1) `73b4aa7` identity-based `CalendarPort.busyEventsInRange`
  (events.list, distinct ids) excluding the own event id, alongside the value-based
  check; (2) `e4eb20f` instant-compare in `hasIdentityBasedCollision` +
  `busyEventsInRange` UTC-normalize (events.list returns +03:00, own range is Z).
  Recorded in review-findings.json (correctness confirmed 7, clean:true).
  **FINAL STATE: 465 unit + 9 integration green, root+dashboard tsc/lint/build
  clean, openspec 6/6, traceability 0, eval ratchet 91, a11y 0 serious/critical
  (live, stage I), recordings 10/0, review-findings clean:true, tree clean.**
  **REMAINING (need the user — archive gated on these):** the HUMAN half of G.3
  (walk a real lead through Telegram intake → tap a slot chip → observe the real
  Telegram Confirm/Decline/Propose messages arriving → outbox restart-durability:
  kill bot mid-decision, restart, confirm delivery next tick); the 1–2 min PR demo
  video; then J archive (`npx openspec archive booking-hitl --yes` — only after the
  human G.3 half, per the plan's "no archiving on green units alone"), and the
  graded PR (`.github/pull_request_template.md`: real name, demo video, human-vs-
  agent decisions, tools/MCP). S5 `kb-learning` is the only other remaining MVP slice.
- **Prior phase — Slice S3 `dashboard` COMPLETE and ARCHIVED.** Archived at
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
- **S4 kickoff — LOCKED human decision (2026-07-07, not yet in a change
  folder):** the decision→lead-notification cross-process channel is a
  **SQLite notification outbox drained by the bot**. The dashboard decision
  route (`apps/dashboard/app/api/decisions/[requestId]/route.ts` — currently
  the inert "Ще не підключено" stub) will: validate admin input → calendar
  sync (CalendarPort, calendar-op-before-DB-commit per the spec) → pure `lib/`
  booking transition → DB commit → INSERT a notification row
  (`delivery_status pending|delivered|failed`, the FR-KB-04 pattern from
  ADR-0001 §4). The bot's loop drains the outbox on a short timer and calls
  `transport.sendMessage`, marking delivered/failed; a failure surfaces on the
  request card for retry (NFR-REL-01). Chosen over a localhost bot HTTP
  listener (would breach ADR-0001 §1 no-inbound) and a reverse AG-UI channel
  (ephemeral, no durable retry). Needs a new `notifications`/outbox table (no
  such table exists yet — schema has bookings/leads/requests only) and the
  bot-drain timer in `packages/bot/src/index.ts`.
  **Seams confirmed:** two state machines — the per-chat CONVERSATION state
  (`lib/src/intake/state-machine.ts`: proposing→awaiting_admin→done) vs the
  BOOKING status enum (`bookings.status`, updated via
  `packages/db/src/bookings.ts updateBookingStatus`). The conversation
  IntakeEvent union has NO propose/hold events yet — S4 adds them (propose at
  `proposing`; slot-pick/request_hold `proposing→awaiting_admin` creating a
  `pending` booking). `propose_slots`/`request_hold` are still pass-through
  no-ops in `loop.ts` (need a CalendarPort seam in `LoopPorts` to call S1's
  `proposeSlots`/`holdWithRecovery`; the pick is a callback in
  `packages/bot/src/pipeline.ts`). Decision transitions must be pure `lib/`
  (TC-PURE-01). **Next concrete step:** author `openspec/changes/booking-hitl/`
  (proposal/design/tasks) via the spec-writer with this decision recorded in
  design.md, then test-first red→green in reviewed stages.
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
