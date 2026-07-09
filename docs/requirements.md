# PRD — Kamerton / Vocal-School Booking Agent

Last updated: 2026-07-03
**G1 scope sign-off: 2026-07-03** — the human signed the MVP scope; every
MVP-phase requirement flipped `proposed → accepted` in this commit. Future
rows stay `proposed` until promoted.

This document is the **single source of truth** for what the product does and
what constraints govern it. Every requirement has a stable ID. Specs, evals,
PRs, and recordings reference these IDs to keep traceability intact.

Refer to [docs/product-brief.md](product-brief.md) for narrative context and to
[DESIGN.md](../DESIGN.md) for the visual identity and voice (BC-BRAND-01).

## ID conventions

| Prefix   | Meaning                    | Example                                        |
| -------- | -------------------------- | ---------------------------------------------- |
| `FR-*`   | Functional Requirement     | `FR-INTAKE-01` — agent collects student data   |
| `NFR-*`  | Non-Functional Requirement | `NFR-LOCAL-01` — fully local run               |
| `TC-*`   | Technical Constraint       | `TC-PROTO-01` — AG-UI as the dashboard transport |
| `BC-*`   | Business / UX Constraint   | `BC-AGE-01` — minimum student age is 4         |

**Status values:** `proposed` · `accepted` · `shipped` · `dropped`.
Transitions: `proposed → accepted` happens at the G1 scope sign-off (one commit
flips the whole MVP set); `accepted → shipped` when the owning capability passes
its release gate; `dropped` at any point, with a note.

**Phase values:** `MVP` · `Future`. The traceability validator treats every row
without the literal word `Future` in its Phase cell as MVP scope — Future rows
are exempt from spec/test coverage until promoted.

**Verification types:** `unit` (pure functions in `lib/`), `integration`
(real DB / transport), `eval` (LLM-judged rubric, `evals/cases/*`), `static`
(structural assertion, e.g. "tool absent from the agent's tool set"). Every FR
names how it will be proven; G4 test-first work starts from this column.

**Ownership rule:** every MVP FR is owned (cited) by exactly one capability
spec. Guardrail FRs are owned by the capability that implements them; the
cross-cutting guardrail *eval suite* additionally exercises each one (see
[Guardrails](#guardrails--cross-cutting-eval-suite)).

## Functional requirements

### Intake (capability `intake`)

Owns FR-INTAKE-01..08 and guardrails FR-GUARD-04/05 (age validation and
conversation steering live in the intake conversation layer).

| ID           | Description                                                                                                                     | Phase | Verification | Status   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------ | -------- |
| FR-INTAKE-01 | In conversation, the agent collects the **mandatory booking data**: student name, age, format (individual/group), preferred weekdays and time range; the Telegram handle is captured automatically. The intake is **5 steps** (2026-07-09): name+age asked together, then format, then weekdays+time together, then the agent proposes slots, then the lead picks. The agent orients on the lead's answers — it records whatever facts a message contains and only asks for what is still missing, never re-asking an answered field | MVP | integration + eval | accepted |
| FR-INTAKE-02 | The agent validates age against BC-AGE-01 and format against BC-SCOPE-01/02 in code **before** proposing slots                  | MVP | unit | accepted |
| FR-INTAKE-03 | ~~The agent asks the lead's **goal** for lessons~~ **DROPPED from MVP 2026-07-09** — the intake is mandatory-only (5 steps); goal is no longer asked and the model is offered no goal tool. Reducer/DB columns kept dormant for possible future reintroduction | Dropped | — | dropped |
| FR-INTAKE-04 | ~~The agent asks about **musical tastes**~~ **DROPPED from MVP 2026-07-09** — see FR-INTAKE-03; tastes/dream-song no longer asked | Dropped | — | dropped |
| FR-INTAKE-05 | ~~The agent asks about **prior experience and comfort**~~ **DROPPED from MVP 2026-07-09** — see FR-INTAKE-03; experience/comfort no longer asked | Dropped | — | dropped |
| FR-INTAKE-06 | The collected mandatory data is compiled into a **first-lesson brief** on the request card, so the teacher can prepare the trial lesson (BC-LESSON-01). Note (2026-07-09): the brief no longer carries goal/tastes/experience (FR-INTAKE-03..05 dropped) — it summarises name, age, format, and the requested schedule | MVP | integration | accepted |
| FR-INTAKE-07 | Before the administrator's decision, the lead can **amend any collected field** ("she's actually 7, not 6") or **cancel** the request; cancellation releases the held slot and sets the booking to `cancelled` | MVP | integration | accepted |
| FR-INTAKE-08 | A message from a known Telegram handle whose previous request is in a terminal state (`confirmed`/`declined`/`cancelled`) starts a **new request**; the student profile lives on the request, so earlier requests are never overwritten (a parent can book a second trial for a sibling) | MVP | integration | accepted |
| FR-GUARD-04  | The agent never books children younger than 4: age is validated in code (`AGE_BELOW_MIN`), not only in the prompt               | MVP | unit + eval | accepted |
| FR-GUARD-05  | On an off-topic message (politics, medicine, law, religion, and similar), the agent's reply (a) contains **no substantive answer** to the off-topic question and (b) **redirects to the school within the same reply**; tone is graded by the rubric in `evals/cases/fr-guard-05.yaml`; the conversation resumes at the state where it left off | MVP | eval | accepted |

### FAQ & learning knowledge base (capability `kb-learning`)

Owns FR-FAQ-01/02, FR-KB-01..05, and guardrails FR-GUARD-02/06 — **including
the Question-inbox dashboard panel** (the `dashboard` capability owns only the
conversation and queue surfaces).

| ID        | Description                                                                                                        | Phase | Verification | Status   |
| --------- | ------------------------------------------------------------------------------------------------------------------ | ----- | ------------ | -------- |
| FR-FAQ-01 | The agent answers questions about the school (format, duration, prices, how to prepare) exclusively from `knowledge/school.md` | MVP | eval | accepted |
| FR-FAQ-02 | If the knowledge base has no answer, the agent says the administrator will clarify and records the question in the request notes; the promise is closed by FR-KB-04 | MVP | eval + integration | accepted |
| FR-KB-01  | **Every** lead question — operationally: any lead turn the agent answers from the KB or cannot answer — is logged to the `questions` table with its answer source (`kb` / `unanswered`). Logging is deterministic, not model-discretionary: `answer_faq` writes its own `kb` row (ADR-0001 §5) | MVP | integration | accepted |
| FR-KB-02  | Unanswered questions appear in a **Question inbox** on the dashboard as a plain list, newest first                 | MVP | integration | accepted |
| FR-KB-03  | The administrator answers a question in the inbox with one action; the answer is appended to `knowledge/school.md`, the question is marked `answered`, and the answer is immediately used for all future leads | MVP | integration | accepted |
| FR-KB-04  | When a question is answered in the inbox, the bot **sends the answer to the originating lead** — the "administrator will clarify" promise is kept | MVP | integration | accepted |
| FR-KB-05  | Inbox entries are deduplicated by similarity and carry an occurrence counter, ordered by frequency                 | Future | integration | proposed |
| FR-GUARD-02 | The agent never quotes prices/terms absent from the knowledge base; "terms" = price, lesson duration, group composition/size, discounts (probed by evals; numeric answers are checked against the base) | MVP | eval | accepted |
| FR-GUARD-06 | The agent **never writes to the knowledge base**: `knowledge/school.md` grows only through admin-approved answers in the Question inbox (FR-KB-03); the agent's tool set has no KB-write operation | MVP | static + eval | accepted |

### Slots (capability `slots`)

Owns FR-SLOT-01..04 and guardrail FR-GUARD-03 (the deterministic grid *is*
the guardrail). The schedule source of truth is the **DEMO Google Calendar**
(TC-CAL-01, ADR-0003): free slots = the deterministic Mon–Fri grid **minus**
calendar busy intervals — the calendar can only *remove* options, never add
them.

| ID         | Description                                                                                                       | Phase | Verification | Status   |
| ---------- | ------------------------------------------------------------------------------------------------------------------ | ----- | ------------ | -------- |
| FR-SLOT-01 | The agent proposes 2–3 free slots that satisfy BC-SCHEDULE-01 and the lead's preferences, computed as the deterministic grid minus busy intervals from the DEMO Google Calendar; slots held by other leads (`pending`, incl. their tentative events) are **excluded from every offer** | MVP | unit + integration | accepted |
| FR-SLOT-02 | The slot chosen by the lead moves to `pending` (a soft hold) and deterministic code creates a **tentative event** in the DEMO calendar; there is **no automatic expiry** in MVP — a stale hold is resolved by the administrator (confirm or decline) | MVP | unit + integration | accepted |
| FR-SLOT-03 | If fewer than 2 slots match the lead's preferences, the agent widens the window (adjacent days/times) and **says so explicitly** — never an empty or silent result | MVP | unit + eval | accepted |
| FR-SLOT-04 | Slots are ranked by a pure `rankSlots()` function in `lib/`: (1) fit to the lead's preferred weekdays/time window, (2) **teacher convenience** — minimal schedule fragmentation (adjacency to existing calendar events, no isolated gaps), (3) earlier dates first; the agent proposes the top-ranked 2–3 | MVP | unit + eval | accepted |
| FR-GUARD-03 | The agent never offers slots outside Mon–Fri 10:00–20:00: the grid is generated by deterministic code and the calendar only subtracts from it; the model only picks from the provided list | MVP | unit | accepted |

### Booking & human-in-the-loop (capability `booking-hitl`)

Owns FR-HITL-01..04 and guardrail FR-GUARD-01.

| ID         | Description                                                                                                                        | Phase | Verification | Status   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----- | ------------ | -------- |
| FR-HITL-01 | A `pending` request appears on the dashboard; the administrator can **Confirm**, **Propose another time**, or **Decline**          | MVP | integration | accepted |
| FR-HITL-02 | After the decision the bot messages the lead: Confirm → confirmation with date/time; Propose another time → the admin-suggested slot(s) as a new proposal; Decline → a kind refusal with the door left open (BC-BRAND-01) | MVP | integration + eval | accepted |
| FR-HITL-03 | Decision state transitions: Confirm → `confirmed`; Decline → `declined`, slot released; Propose another time → hold released, booking returns to `proposing` with the administrator's suggested slot(s); a lead message after a terminal state re-enters the flow per FR-INTAKE-08 | MVP | unit + integration | accepted |
| FR-HITL-04 | Admin decisions sync the DEMO calendar: Confirm re-validates the slot against the calendar, then upgrades the tentative event to **confirmed**, writing the first-lesson brief into the event description; Decline (or lead cancellation, FR-INTAKE-07) **deletes** the tentative event | MVP | integration | accepted |
| FR-GUARD-01 | The agent never confirms a lesson on its own: the `confirmed` transition exists only in the dashboard's admin handler; the agent has no tool for it | MVP | static + eval | accepted |

### Dashboard (capability `dashboard`)

Owns the conversation and queue surfaces; the Question inbox belongs to
`kb-learning`.

| ID         | Description                                                                                                                  | Phase | Verification | Status   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ | ----- | ------------ | -------- |
| FR-DASH-01 | The dashboard shows in real time: active conversations (streamed agent text), request state (collected fields), and the queue of `pending` requests | MVP | integration | accepted |
| FR-DASH-02 | A developer panel shows raw AG-UI events (agent transparency for the demo)                                                    | Future | integration | proposed |
| FR-DASH-03 | The week's schedule renders as a **concert-hall map** (`HallMap`, DESIGN.md): days are rows, slots are seats, colored by the status tokens (free / `pending` / `confirmed` / `cancelled`); clicking a `pending` seat opens its request card with the DecisionBar | MVP | integration | accepted |

### Groups (capability `groups`)

The whole capability is **Future** — it ships after the single-lesson MVP loop
is green, together with its `waitlist` table (TC-DATA-01).

| ID          | Description                                                                                                              | Phase | Verification | Status   |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | ----- | ------------ | -------- |
| FR-GROUP-01 | For the group format, the agent offers an existing group with free seats where \|student age − each member's age\| ≤ 2 years, or adds the lead to a "new group" waitlist; a group join flows through the same `pending`/HITL decision | Future | integration | proposed |

### Web booking (capability `web-booking`)

The second lead-facing channel — **Future**, captured now so the architecture
stays channel-agnostic (the agent core is already transport-independent,
ADR-0001). Runs on localhost like everything else; publishing it — and a
Telegram Mini App reusing the same page — is a post-MVP decision.

| ID        | Description                                                                                                              | Phase | Verification | Status   |
| --------- | -------------------------------------------------------------------------------------------------------------------------- | ----- | ------------ | -------- |
| FR-WEB-01 | A lead-facing web page where a visitor picks a trial slot on the concert-hall seat map (`HallMap`, DESIGN.md) and talks to the **same agent** (CopilotKit chat); a picked seat follows the same `pending` → HITL loop (FR-HITL-01..03) and the same guardrails | Future | integration + eval | proposed |
| FR-WEB-02 | Lead identity is channel-agnostic: a lead exists without a Telegram handle; requests link to a lead via `(channel, channel_id)` | Future | unit + integration | proposed |

### Guardrails — cross-cutting eval suite

Guardrail FRs are **owned by their implementing capabilities** (one owner per
FR): FR-GUARD-01 → `booking-hitl`, FR-GUARD-02/06 → `kb-learning`,
FR-GUARD-03 → `slots`, FR-GUARD-04/05 → `intake`. What is cross-cutting is the
**eval suite**: each FR-GUARD ships a named eval case
`evals/cases/fr-guard-*.yaml` (LLM-as-judge + hard asserts on DB state), and
deterministic rules are additionally unit-tested in `lib/` (TC-TEST-01/02,
TC-PURE-01).

| Guardrail   | Owner          | Enforced by                                            |
| ----------- | -------------- | ------------------------------------------------------ |
| FR-GUARD-01 | `booking-hitl` | no confirm tool in the agent's tool set (static)       |
| FR-GUARD-02 | `kb-learning`  | eval probes + numeric answers checked against the base |
| FR-GUARD-03 | `slots`        | deterministic slot generator (unit-tested)             |
| FR-GUARD-04 | `intake`       | `AGE_BELOW_MIN` in code (unit-tested)                  |
| FR-GUARD-05 | `intake`       | eval rubric `fr-guard-05.yaml`                         |
| FR-GUARD-06 | `kb-learning`  | no KB-write tool in the agent's tool set (static)      |

## Non-functional requirements

| ID           | Description                                                                                                         | Phase | Verification | Status   |
| ------------ | --------------------------------------------------------------------------------------------------------------------- | ----- | ------------ | -------- |
| NFR-LOCAL-01 | Fully local run: Telegram via long polling (no public URL/webhook); dashboard on `localhost` only; the only outbound connections are the Telegram Bot API, the Anthropic API, and the Google Calendar API (TC-CAL-01) | MVP | integration | accepted |
| NFR-SEC-01   | Secrets: `TELEGRAM_BOT_TOKEN` comes only from a local `.env`; Anthropic auth uses the developer's local user token (`ant auth login` profile / `ANTHROPIC_AUTH_TOKEN`) — no Anthropic API key is stored in the repo or `.env`; the Google service-account JSON key lives in a gitignored file referenced from `.env` (TC-CAL-01); nothing secret is committed (see TC-SEC-01) | MVP | static | accepted |
| NFR-UX-01    | p90 ≤ 5 s from the bot receiving a Telegram update to the first `sendMessage`/`sendChatAction` call, measured from timestamps logged during the eval-suite run | MVP | integration | accepted |
| NFR-PRIV-01  | Leads' personal data (SQLite file) never reaches the public repo; `*.db` is gitignored                               | MVP | static | accepted |
| NFR-PRIV-02  | The bot's greeting carries a one-line notice that messages are processed via the Anthropic API; a lead's record (with its questions and bookings) is deleted on request via an admin action | MVP | integration + eval | accepted |
| NFR-REL-01   | On an Anthropic, Telegram, or Google Calendar API failure the bot sends a deterministic Ukrainian apology-and-retry message (no LLM involved), preserves the conversation state for resumption, and never silently drops a lead message | MVP | integration | accepted |
| NFR-DX-01    | `npm run lint && tsc --noEmit && npm test` finish in < 60 s on a clean checkout                                      | MVP | static | accepted |

## Technical constraints

| ID          | Description                                                                                                          | Phase | Status   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ | ----- | -------- |
| TC-STACK-01 | TypeScript monorepo: `packages/bot` (grammY, long polling), `packages/agent`, `apps/dashboard` (Next.js App Router)   | MVP | accepted |
| TC-STACK-02 | Agent LLM: Claude API (`claude-sonnet-5`) with a thin, visible tool-use loop — no heavy agent framework                | MVP | accepted |
| TC-PROTO-01 | Dashboard transport is **AG-UI** over SSE (CopilotKit on the frontend); A2UI payloads are a possible future extension, not MVP | MVP | accepted |
| TC-DATA-01  | Storage: SQLite via `better-sqlite3` (single file, gitignored) for leads, requests, bookings, questions; the **schedule source of truth is the DEMO Google Calendar** (TC-CAL-01): free slots = deterministic Mon–Fri grid (10:00–19:00 starts, 60-min step, in code) minus calendar busy intervals; `bookings.status ∈ {pending, confirmed, declined, cancelled}`; the intake profile lives on the booking request, not the lead row (FR-INTAKE-08); a `waitlist` table ships with the Future `groups` capability | MVP | accepted |
| TC-CAL-01   | Google Calendar API v3 against a dedicated personal **DEMO calendar**; auth via a **service account** whose email the calendar is shared with ("Make changes"); the service-account JSON key sits in a gitignored file referenced from `.env` (`GOOGLE_APPLICATION_CREDENTIALS`), the calendar id in `.env`; free/busy is polled on demand — no inbound webhooks (NFR-LOCAL-01). The adapter's transport is decided by a time-boxed spike: a Google Calendar **MCP server** (the backend as MCP client — never the model directly) or the googleapis SDK; the adapter interface (TC-PURE-01) makes the choice swappable | MVP | accepted |
| TC-SEC-01   | Pre-commit hook runs **gitleaks**; `.env.example` with placeholders is committed, `.env` never is                      | MVP | accepted |
| TC-PURE-01  | `lib/` is framework-free (no `next/*`, no DOM, no Telegram SDK, no Google SDK): the slot grid, free-slot subtraction, `rankSlots()` scoring, age validation, and the booking state machine are pure and 100% unit-testable — calendar I/O stays behind an adapter | MVP | accepted |
| TC-TEST-01  | Vitest for unit tests on `lib/` (slot generator, age validation, booking transitions)                                  | MVP | accepted |
| TC-TEST-02  | LLM behavior is verified by an eval runner (`npm run evals`, cases in `evals/cases/*.yaml`, LLM-as-judge + hard asserts on DB state); runs locally and in CI on every PR | MVP | accepted |
| TC-TEST-03  | E2E verification of the dashboard and demo-proof recordings are driven through the **chrome-devtools MCP** from the coding agent; recorded clips land under `docs/qa/` and assert the FR ids they demonstrate | MVP | accepted |

## Business / UX constraints

| ID             | Description                                                                                                        | Phase | Status   |
| -------------- | -------------------------------------------------------------------------------------------------------------------- | ----- | -------- |
| BC-SCOPE-01    | The school teaches **voice only**; it does not teach musical instruments                                            | MVP | accepted |
| BC-SCOPE-02    | The piano is used by the teacher **only to accompany vocal warm-ups**; a "piano lessons" request gets a polite explanation, never a promise | MVP | accepted |
| BC-AGE-01      | Minimum student age is **4**; younger — a kind "come back at 4", no request created                                 | MVP | accepted |
| BC-AGE-02      | ~~For students younger than **10**, the get-to-know questions (FR-INTAKE-03..05) are addressed to the parent~~ **DROPPED from MVP 2026-07-09** — the get-to-know questions were removed with FR-INTAKE-03..05; the remaining mandatory questions (name/age/format/schedule) are neutral facts. The parent-vs-student addressing helper is kept dormant | Dropped | dropped |
| BC-FORMAT-01   | Formats: **individual** and **group**; if the lead is unsure, the agent explains the difference from the knowledge base and asks again | MVP | accepted |
| BC-SCHEDULE-01 | Booking only **Mon–Fri, 10:00–20:00** (last 60-min lesson starts at 19:00); Sat/Sun are never offered, even on request | MVP | accepted |
| BC-PRICE-01    | Prices, durations, and group composition come **only** from the knowledge base                                      | MVP | accepted |
| BC-LESSON-01   | The trial lesson is prepared around the student: the teacher receives the first-lesson brief (goal, tastes, a song they'd love to sing, experience/comfort) before confirming the slot | MVP | accepted |
| BC-LANG-01     | The agent understands input in any language but **always replies in Ukrainian**                                     | MVP | accepted |
| BC-BRAND-01    | Visual identity and voice follow [DESIGN.md](../DESIGN.md); lead-facing tone is Ukrainian-first, kind, and pressure-free; the get-to-know questions are curiosity, never assessment — no grading or level-check language (rubric anchors in DESIGN.md) | MVP | accepted |
| BC-DEMO-01     | The repo, a 1–2 min video, and a green `npm run evals` run are the homework's primary artifacts; every requirement is demonstrable locally | MVP | accepted |

## Out of scope (MVP)

- Payments, reminders, rescheduling of already-confirmed lessons
- Calendar integrations beyond the single DEMO Google Calendar (TC-CAL-01); two-way sync via webhooks (free/busy is polled — inbound connections stay forbidden)
- Public deployment; anything requiring inbound connections or tunnels
- Voice messages, audio analysis, non-music subjects
- Multi-teacher scheduling; the school has exactly one teacher
- Automatic expiry of slot holds (a stale `pending` is resolved by the administrator)
- Group matching and the waitlist (`groups` capability, FR-GROUP-01) — Future
- Question-inbox deduplication and frequency counters (FR-KB-05) — Future
- The raw-events developer panel (FR-DASH-02) — Future
- The lead-facing web channel with the concert-hall seat picker (`web-booking`, FR-WEB-01/02) — Future; a Telegram Mini App is a possible packaging of the same page after publication
