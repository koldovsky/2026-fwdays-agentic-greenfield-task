# MVP Capability Plan — Slice DAG (Phase 3)

**G3 sign-off:** [x] Human has reviewed this slice plan and approved the
sequencing, ownership, and dependency graph below. Signed 2026-07-04.

> Purpose: the deterministic bridge between the 30 accepted MVP FRs
> (`docs/requirements.md`) and the per-slice OpenSpec/implementation work.
> `node scripts/check-traceability.mjs` reads this file for its
> **plan-ownership** check: every MVP FR id must be assigned to exactly one
> slice below (id format `FR-XXX-NN`, matched anywhere in this file by the
> validator's `idsIn()` regex). Each "Owned FR ids" list is therefore the
> single, authoritative, non-overlapping partition of the 30 MVP FRs — do not
> hand-edit a slice's ownership without moving the id out of whichever other
> slice previously held it.
>
> Scope is **decided**, not proposed here (see `docs/current-state.md` Phase 2
> exit): five slices, `slots` first. This document sequences the work and
> pins test/demo obligations per AGENTS.md's test-first and recording rules;
> it does not re-litigate the split.

## Slice DAG

```
                 ┌──────────────┐
                 │  S1 · slots  │  (flagship, no deps)
                 └──────┬───────┘
                        │
                 ┌──────▼───────┐
                 │ S2 · intake  │
                 └──────┬───────┘
                        │
                 ┌──────▼────────┐
                 │ S3 · dashboard│
                 └──────┬────────┘
                        │
            ┌───────────┴────────────┐
            │                        │
   ┌────────▼─────────┐    ┌─────────▼─────────┐
   │ S4 · booking-hitl │    │ S5 · kb-learning  │
   └────────────────────┘    └───────────────────┘

S4 depends on S1 + S2 + S3 (needs real slots, real requests, real dashboard
surfaces to attach the DecisionBar to).
S5 depends on S2 + S3 (needs the conversation flow to trigger answer_faq /
log_question, and the dashboard shell to host the Question inbox panel).
S4 and S5 do not depend on each other — they can run in parallel once S3
is archived.
```

## Sequencing rationale

`slots` goes first because it is the flagship pure-`lib/` slice (ADR-0003):
zero framework dependencies, the richest unit-test surface, and it resolves
the highest-risk unknown early — the MCP-vs-googleapis calendar adapter spike
(TC-CAL-01) — before any UI or conversation code is built on top of an
unstable interface. `intake` comes second because every later slice needs
real conversation state and a real vetted slot list to render or decide
against; building the bot before slots exist would mean faking the list it
proposes. `dashboard` comes third: it needs `intake` to produce real
conversations and requests to show in the queue and HallMap — an empty
dashboard proves nothing. `booking-hitl` and `kb-learning` both slot in last
and are mutually independent (booking-hitl operates on requests +
calendar + dashboard surfaces already built by S1–S3; kb-learning operates on
the conversation's FAQ path + a dashboard inbox panel) — they fan out in
parallel once S3 is archived, each starting its own `openspec/changes/`
folder and its own test-first red→green loop.

## OpenSpec mechanics (applies to every slice)

1. Before implementation starts, create `openspec/changes/<slice>/` with
   `proposal.md` (why/what/impact), `design.md` only if there is a real
   technical decision beyond the baseline spec, and `tasks.md` (checklist,
   test-first ordering: write failing tests from the spec, confirm red, then
   implement to green).
2. The change folder's `specs/<capability>/spec.md` delta amends the
   already-G2-passed baseline spec under `openspec/specs/<capability>/` only
   if the slice reveals a gap; otherwise the baseline spec already covers it
   and the change folder just implements it.
3. `npx openspec validate --all --strict` must pass before and after the
   slice.
4. The slice is **archived** (`openspec archive <slice>`) only after (a) all
   `tasks.md` items are checked, and (b) a real-DB smoke test pass — no
   archiving on green unit tests alone. `check-traceability.mjs`'s
   `tasks-complete` check fails the build if an archived change has any
   unchecked task.
5. Re-run the validation cadence from AGENTS.md (`lint`, `test:run`,
   `test:integration` once the layer exists, `test:e2e` once it exists,
   `build`, `openspec validate --all --strict`, `check-traceability.mjs`,
   `check-eval-ratchet.mjs` once evals exist) before and after the slice.

---

## S1 · `slots` (first, flagship — no dependencies)

**Goal:** compute a deterministic, guardrail-safe set of bookable slots
against the DEMO Google Calendar, rank them for lead fit + teacher
convenience, and hold a chosen slot as a tentative calendar event — all in
framework-free `lib/` code behind one calendar-adapter interface.

**Owned FR ids:** FR-SLOT-01, FR-SLOT-02, FR-SLOT-03, FR-SLOT-04,
FR-GUARD-03.

**NFR/TC/BC touchpoints:** TC-CAL-01 (service-account auth, MCP-vs-googleapis
adapter spike), TC-PURE-01 (`lib/` stays framework-free), TC-DATA-01 (grid
10:00–19:00 starts, 60-min step), TC-TEST-01 (Vitest unit tests), BC-SCHEDULE-01
(Mon–Fri 10:00–20:00 only), NFR-REL-01 (calendar-failure apology path, no
silent drop). NFR-UX-01 is owned by S2 `intake` (bot ack latency); S1 is only
an input to it — free/busy latency observed in the spike: warm ~170–220ms,
well inside the budget (no separate S1 latency NFR exists).

**Dependencies:** none.

**Test layers:**
- Unit (`lib/`, Vitest, TC-TEST-01): grid generation, half-open interval
  subtraction, `rankSlots()` scoring (fit → teacher compactness → earlier
  dates), fewer-than-2-matches widening path (FR-SLOT-03), tentative
  hold/create/delete against a fixture calendar adapter, timezone conversion
  (Europe/Kyiv wall-clock vs RFC3339 UTC per the spec's conventions section).
- Integration (real DEMO calendar, real service-account credentials):
  free/busy fetch, tentative-event create/delete round-trip, calendar-outage
  path (NFR-REL-01 apology + state preservation).
- E2E/chrome-devtools: not primarily UI-facing yet (no dashboard exists in
  S1) — deferred to S3/S4 where the HallMap renders these slots visually; S1
  itself is proven by unit + integration only.

**Demo-proof expectation:** an eval case or integration test log showing a
live free/busy call against the DEMO calendar filling in around a seeded busy
event, the ranked top-2/3 slots printed, and a tentative event visibly created
then deleted in the calendar UI (screenshot evidence, since there is no app
UI yet); `evals/cases/fr-guard-03.eval.ts` and `fr-slot-03/04` unit tests feed
`docs/qa/eval-report.md` and the requirements-traceability matrix.

---

## S2 · `intake`

**Goal:** run the Telegram conversation state machine that qualifies,
profiles, and collects a lead's booking preferences in Ukrainian, validating
in code before ever proposing a slot from S1's vetted list.

**Owned FR ids:** FR-INTAKE-01, FR-INTAKE-02, FR-INTAKE-03, FR-INTAKE-04,
FR-INTAKE-05, FR-INTAKE-06, FR-INTAKE-07, FR-INTAKE-08, FR-GUARD-04,
FR-GUARD-05.

**NFR/TC/BC touchpoints:** BC-AGE-01/02, BC-SCOPE-01/02, BC-FORMAT-01,
BC-LESSON-01, BC-LANG-01, BC-BRAND-01 (voice rules embedded verbatim in the
static prompt), TC-STACK-01/02 (grammY + thin Claude tool loop),
TC-DATA-01 (requests carry the intake profile, never overwritten —
FR-INTAKE-08), NFR-UX-01 (p90 ≤ 5s to first send), NFR-REL-01 (Telegram/
Anthropic failure apology + resumable state).

**Dependencies:** S1 (`slots`) — the proposal step in the `proposing` state
consumes S1's already-vetted, ranked slot list; nothing in `intake` computes
slots itself.

**Test layers:**
- Unit (`lib/`): age validation (`AGE_BELOW_MIN`, FR-GUARD-04), conversation
  state-machine transitions (`greeting → … → awaiting_admin`, detours for
  scope explanation and off-topic steering per ADR-0001 §6), amend/cancel
  field mutation logic (FR-INTAKE-07), new-request-on-terminal-state
  branching (FR-INTAKE-08).
- Integration (real SQLite, real grammY bot against a test Telegram chat):
  full qualifying→collecting flow, first-lesson-brief compilation
  (FR-INTAKE-06), returning-lead second-request creation.
- Eval (`evals/cases/*.eval.ts`, LLM-as-judge): goal/tastes/experience
  question tone and BC-BRAND-01 curiosity-not-assessment rubric, off-topic
  redirect grading (`fr-guard-05.eval.ts`), parent-addressed questions for
  under-10 students (FR-INTAKE-04/BC-AGE-02).
- E2E/chrome-devtools: not applicable yet (Telegram-only surface, no
  dashboard); the conversation becomes visible in S3's dashboard queue.

**Demo-proof expectation:** `evals/cases/fr-guard-04.eval.ts` and
`fr-guard-05.eval.ts` verdicts in `docs/qa/eval-report.md`, plus an
integration-test transcript log of a full intake conversation (age validation
reject, off-topic redirect-and-resume, amend, cancel, and a second request
from a returning handle) referenced from the manual test plan.

---

## S3 · `dashboard`

**Goal:** stand up the Next.js dashboard shell — the live conversation queue,
the concert-hall week map, and the AG-UI/SSE transport — so the administrator
can see real leads and real requests in real time, with an empty state that
does not look broken before the first lead arrives.

**Owned FR ids:** FR-DASH-01, FR-DASH-03.

**NFR/TC/BC touchpoints:** TC-PROTO-01 (AG-UI over SSE, CopilotKit
frontend), TC-STACK-01 (Next.js App Router in `apps/dashboard`), NFR-LOCAL-01
(binds to `127.0.0.1` only), NFR-PRIV-02 (delete-lead admin action, greeting
notice about Anthropic processing lives in S2 but the delete action's UI
lives here), BC-BRAND-01/DESIGN.md (HallMap status-token colors, voice/visual
identity).

**Dependencies:** S2 (`intake`) — the queue and conversation panel need real
conversations and requests to stream; a dashboard built against fixtures
first would need to be re-verified against the real event shape anyway.

**Test layers:**
- Unit (`lib/`): any pure formatting/derivation used by HallMap (status-token
  mapping from `bookings.status`, week-grid layout math) if factored into
  `lib/`; server-only glue stays out of `lib/` per TC-PURE-01.
- Integration (real SQLite + real AG-UI/SSE stream): conversation panel
  reflects a live streamed reply, queue reflects a real `pending` request,
  delete-lead action removes the lead's questions/bookings (NFR-PRIV-02).
- E2E/chrome-devtools (TC-TEST-03): dashboard loads on `localhost:3000`,
  empty-state screenshot (no conversations yet), populated-state screenshot
  (queue + HallMap with a live `pending` seat), light+dark `check-a11y` (axe)
  pass, `vision-verify` pass on the settled still.
- Recording: one clip per viewport per the recording quality bar (desktop +
  mobile-360 if the dashboard claims responsive support — otherwise desktop
  only, explicitly noted as the reviewed scope).

**Demo-proof expectation:** `docs/qa/` recording(s) with a manifest citing
FR-DASH-01 and FR-DASH-03, each frame-sensitive moment (empty queue, HallMap
color states) captured as a still and visually reviewed before being counted
as evidence (per the recording quality bar — no un-reviewed clips shipped).

---

## S4 · `booking-hitl`

**Goal:** give the administrator the pending-request card and DecisionBar
(Confirm / Decline / Propose another time) as pure, testable state-machine
transitions, synced back to the DEMO calendar and to the lead via Telegram —
the only place a booking can become `confirmed`.

**Owned FR ids:** FR-HITL-01, FR-HITL-02, FR-HITL-03, FR-HITL-04,
FR-GUARD-01.

**NFR/TC/BC touchpoints:** TC-PURE-01 (transition functions are pure
`lib/`), TC-CAL-01/ADR-0003 (Confirm re-validates against the calendar before
upgrading the tentative event; Decline/cancellation deletes it), BC-BRAND-01
(kind refusal wording, door left open), BC-LESSON-01 (first-lesson brief
written into the confirmed event description), NFR-REL-01 (calendar
re-validation failure path), NFR-UX-01 (decision-to-notification latency).

**Dependencies:** S1 (`slots` — calendar adapter + tentative-event
lifecycle), S2 (`intake` — requests and the first-lesson brief to display),
S3 (`dashboard` — the surface the request card and DecisionBar render into).

**Test layers:**
- Unit (`lib/`): Confirm/Decline/Propose-another-time as pure state
  transitions (`pending → confirmed/declined/cancelled`; `proposing` is a
  conversation state, never a `bookings.status` value — G2 fix), re-entry via
  FR-INTAKE-08 after a terminal state, no-confirm-tool-in-agent's-tool-set
  static assertion (FR-GUARD-01).
- Integration (real SQLite + real DEMO calendar): Confirm re-validates a
  slot that was manually taken on the calendar since the hold (collision
  path per ADR-0003 follow-up), calendar sync on each of the three
  decisions, Telegram notification delivery for each outcome.
- Eval: refusal-tone rubric for Decline (BC-BRAND-01), FR-GUARD-01 static +
  eval probe (agent never claims to have confirmed).
- E2E/chrome-devtools: DecisionBar click-through for all three transitions,
  axe pass, vision-verify on the settled request-card state after each
  decision.

**Demo-proof expectation:** a recording (manifest citing FR-HITL-01..04 and
FR-GUARD-01) of Confirm and Decline end-to-end — calendar event visibly
changing state, Telegram message arriving — cited from
`docs/qa/eval-report.md` (guardrail eval verdict) and the acceptance report;
the eval verdict, not the clip alone, is the pass/fail signal for
FR-GUARD-01.

---

## S5 · `kb-learning`

**Goal:** answer FAQs strictly from `knowledge/school.md`, log every
answered-or-unanswered lead question, and let the administrator grow the
knowledge base only through the dashboard's Question inbox — never the
agent.

**Owned FR ids:** FR-FAQ-01, FR-FAQ-02, FR-KB-01, FR-KB-02, FR-KB-03,
FR-KB-04, FR-GUARD-02, FR-GUARD-06.

**NFR/TC/BC touchpoints:** BC-PRICE-01 (prices/durations/composition only
from the KB), TC-DATA-01 (`questions` table incl. `delivery_status` per the
ADR-0001 §4 amendment), NFR-REL-01 (answer-delivery retry on failure —
FR-KB-04's "administrator will clarify" promise must not silently drop).

**Dependencies:** S2 (`intake` — the conversation surface that triggers
`answer_faq`/`log_question`), S3 (`dashboard` — hosts the Question inbox
panel).

**Test layers:**
- Unit (`lib/` where applicable): none of this capability's core logic is
  pure-computational beyond simple string/lookup helpers; most correctness
  is enforced structurally (no KB-write tool in the tool set, FR-GUARD-06)
  and via integration/eval.
- Integration (real SQLite): `answer_faq` inserts its own `kb` row
  (FR-KB-01), unanswered questions appear in the inbox newest-first
  (FR-KB-02), admin answer appends to `knowledge/school.md` and marks
  `answered` (FR-KB-03), answer delivery to the originating lead with retry
  on `delivery_status: failed` (FR-KB-04).
- Eval: FAQ answers stay within the KB (FR-FAQ-01), numeric/price answers
  checked against the KB content (FR-GUARD-02), "I don't know, admin will
  clarify" framing (FR-FAQ-02).
- Static: FR-GUARD-06 — assert the agent's tool set has no KB-write
  operation (structural test, no LLM call needed).
- E2E/chrome-devtools: Question inbox panel — empty state, populated state,
  one-click answer action, axe + vision-verify pass.

**Demo-proof expectation:** eval verdicts for FR-GUARD-02/06 and FR-FAQ-01/02
in `docs/qa/eval-report.md`; an integration-test log showing the full
unanswered→admin-answers→lead-receives-answer loop; a recording (manifest
citing FR-KB-02/03/04) of the inbox answer action, reviewed per the recording
quality bar before being counted as evidence.

---

## Slice → FR ownership summary

| Slice | Owned FR ids | Count |
|---|---|---|
| S1 `slots` | FR-SLOT-01, FR-SLOT-02, FR-SLOT-03, FR-SLOT-04, FR-GUARD-03 | 5 |
| S2 `intake` | FR-INTAKE-01..08, FR-GUARD-04, FR-GUARD-05 | 10 |
| S3 `dashboard` | FR-DASH-01, FR-DASH-03 | 2 |
| S4 `booking-hitl` | FR-HITL-01..04, FR-GUARD-01 | 5 |
| S5 `kb-learning` | FR-FAQ-01, FR-FAQ-02, FR-KB-01..04, FR-GUARD-02, FR-GUARD-06 | 8 |
| **Total** | | **30** |

Every MVP FR from `docs/requirements.md` appears in exactly one slice's
"Owned FR ids" list above — no id is duplicated across slices, and none is
left unassigned. `FR-KB-05`, `FR-DASH-02`, `FR-GROUP-01`, `FR-WEB-01/02` are
`Future`-phase and intentionally excluded (out of MVP scope, see
`docs/requirements.md` §"Out of scope").
