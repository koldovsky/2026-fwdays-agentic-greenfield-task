# PRD — Kamerton / Vocal-School Booking Agent

Last updated: 2026-07-03

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

Status values: `proposed` · `accepted` · `shipped` · `dropped`.

## Functional requirements

### Intake (capability `intake`)

| ID           | Description                                                                                                                     | Status   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-INTAKE-01 | In conversation, the agent collects: student name, age, format (individual/group), preferred weekdays and time range; the Telegram handle is captured automatically | proposed |
| FR-INTAKE-02 | The agent validates age against BC-AGE-01 and format against BC-SCOPE-01/02 **before** proposing slots                          | proposed |
| FR-INTAKE-03 | The agent asks the lead's **goal** for lessons — karaoke with friends, performing on stage, overcoming shyness, or their own words ("what brings you in?"); one predefined tag (`karaoke` / `performance` / `confidence` / `hobby` / `other`) plus the verbatim answer are stored | proposed |
| FR-INTAKE-04 | The agent asks about **musical tastes**: favourite artists/songs, what's on the lead's playlist, and one song they would love to sing; for young children the questions go to the parent (favourite cartoons, songs the child sings along to) | proposed |
| FR-INTAKE-05 | The agent asks about **prior experience and comfort**: any previous training (choir, lessons) and whether singing a cappella or with a backing track feels more comfortable — a soft shyness signal, never framed as a test | proposed |
| FR-INTAKE-06 | Goals, tastes, and experience are compiled into a **first-lesson brief** on the request card, so the teacher can prepare a trial lesson around music the student already loves (BC-LESSON-01) | proposed |

### FAQ & learning knowledge base (capability `kb-learning`)

| ID        | Description                                                                                                        | Status   |
| --------- | ------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-FAQ-01 | The agent answers questions about the school (format, duration, prices, how to prepare) exclusively from `knowledge/school.md` | proposed |
| FR-FAQ-02 | If the knowledge base has no answer, the agent says the administrator will clarify and records the question in the request notes | proposed |
| FR-KB-01  | **Every** question a lead asks is logged to the `questions` table with its answer source (`kb` / `unanswered`)     | proposed |
| FR-KB-02  | Unanswered questions surface in a **Question inbox** on the dashboard, deduplicated by similarity, ordered by frequency | proposed |
| FR-KB-03  | The administrator answers a question in the inbox with one action; the answer is appended to `knowledge/school.md` and is immediately used for all future leads | proposed |

### Slots (capability `slots`)

| ID         | Description                                                                                                       | Status   |
| ---------- | ------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-SLOT-01 | The agent proposes 2–3 free slots from the local slot database that satisfy BC-SCHEDULE-01 and the lead's preferences | proposed |
| FR-SLOT-02 | The slot chosen by the lead moves to `pending` (a soft hold) until the administrator's decision                     | proposed |

### Booking & human-in-the-loop (capability `booking-hitl`)

| ID         | Description                                                                                                                        | Status   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-HITL-01 | A `pending` request appears on the dashboard; the administrator can **Confirm**, **Propose another time**, or **Decline**; no confirmation reaches the lead without an administrator action | proposed |
| FR-HITL-02 | After the administrator's decision, the bot sends the lead a final message (confirmation with date/time, or an alternative)          | proposed |

### Dashboard (capability `dashboard`)

| ID         | Description                                                                                                                  | Status   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-DASH-01 | The dashboard shows in real time: active conversations (streamed agent text), request state (collected fields), and the queue of `pending` requests | proposed |
| FR-DASH-02 | A developer panel shows raw AG-UI events (agent transparency for the demo)                                                    | proposed |

### Groups (capability `groups`, optional)

| ID          | Description                                                                                                              | Status   |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-GROUP-01 | For the group format, the agent offers an existing group with free seats (age within ±2 years of its members) or a "new group" waitlist | proposed |

### Guardrails (capability `guardrails`)

Each FR-GUARD ships with a named eval case `evals/cases/<id>.yaml`; deterministic
rules are additionally unit-tested in `lib/` (TC-TEST-01/02, TC-PURE-01).

| ID          | Description                                                                                                         | Status   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-GUARD-01 | The agent never confirms a lesson on its own: the `confirmed` transition exists only in the dashboard's admin handler; the agent has no tool for it | proposed |
| FR-GUARD-02 | The agent never quotes prices/terms absent from the knowledge base (probed by evals; numeric answers are checked against the base) | proposed |
| FR-GUARD-03 | The agent never offers slots outside Mon–Fri 10:00–20:00: slots are generated by deterministic code; the model only picks from the provided list | proposed |
| FR-GUARD-04 | The agent never books children younger than 4: age is validated in code (`AGE_BELOW_MIN`), not only in the prompt   | proposed |
| FR-GUARD-05 | Off-topic conversation (politics, medical advice, etc.) is politely steered back to the school                      | proposed |
| FR-GUARD-06 | The agent **never writes to the knowledge base**: `knowledge/school.md` grows only through admin-approved answers in the Question inbox (FR-KB-03); the agent's tool set has no KB-write operation | proposed |

## Non-functional requirements

| ID           | Description                                                                                                         | Status   |
| ------------ | --------------------------------------------------------------------------------------------------------------------- | -------- |
| NFR-LOCAL-01 | Fully local run: Telegram via long polling (no public URL/webhook); dashboard on `localhost` only; the only outbound connections are the Telegram Bot API and the Anthropic API | accepted |
| NFR-SEC-01   | Secrets (`TELEGRAM_BOT_TOKEN`, `ANTHROPIC_API_KEY`) come only from a local `.env`; nothing secret is committed (see TC-SEC-01) | accepted |
| NFR-UX-01    | First agent reply to a lead within ~5 s; dashboard text streams as it is generated                                    | proposed |
| NFR-PRIV-01  | Leads' personal data (SQLite file) never reaches the public repo; `*.db` is gitignored                                | accepted |
| NFR-DX-01    | `npm run lint && tsc --noEmit && npm test` finish in < 60 s on a clean checkout                                       | proposed |

## Technical constraints

| ID          | Description                                                                                                          | Status   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| TC-STACK-01 | TypeScript monorepo: `packages/bot` (grammY, long polling), `packages/agent`, `apps/dashboard` (Next.js App Router)   | accepted |
| TC-STACK-02 | Agent LLM: Claude API (`claude-sonnet-4-6`) with a thin, visible tool-use loop — no heavy agent framework              | accepted |
| TC-PROTO-01 | Dashboard transport is **AG-UI** over SSE (CopilotKit on the frontend); A2UI payloads are a possible future extension, not MVP | accepted |
| TC-DATA-01  | Storage: SQLite via `better-sqlite3`; single file, gitignored; slots pre-generated Mon–Fri 10:00–19:00 starts, 60-min step | accepted |
| TC-SEC-01   | Pre-commit hook runs **gitleaks**; `.env.example` with placeholders is committed, `.env` never is                      | accepted |
| TC-PURE-01  | `lib/` is framework-free (no `next/*`, no DOM, no Telegram SDK): slot generation, age validation, and the booking state machine are pure and 100% unit-testable | accepted |
| TC-TEST-01  | Vitest for unit tests on `lib/` (slot generator, age validation, booking transitions)                                  | proposed |
| TC-TEST-02  | LLM behavior is verified by an eval runner (`npm run evals`, cases in `evals/cases/*.yaml`, LLM-as-judge + hard asserts on DB state); runs locally and in CI on every PR | proposed |

## Business / UX constraints

| ID             | Description                                                                                                        | Status   |
| -------------- | -------------------------------------------------------------------------------------------------------------------- | -------- |
| BC-SCOPE-01    | The school teaches **voice only**; it does not teach musical instruments                                            | accepted |
| BC-SCOPE-02    | The piano is used by the teacher **only to accompany vocal warm-ups**; a "piano lessons" request gets a polite explanation, never a promise | accepted |
| BC-AGE-01      | Minimum student age is **4**; younger — a kind "come back at 4", no request created                                 | accepted |
| BC-FORMAT-01   | Formats: **individual** and **group**; if the lead is unsure, the agent explains the difference from the knowledge base and asks again | accepted |
| BC-SCHEDULE-01 | Booking only **Mon–Fri, 10:00–20:00** (last 60-min lesson starts at 19:00); Sat/Sun are never offered, even on request | accepted |
| BC-PRICE-01    | Prices, durations, and group composition come **only** from the knowledge base                                      | accepted |
| BC-LESSON-01   | The trial lesson is prepared around the student: the teacher receives the first-lesson brief (goal, tastes, a song they'd love to sing, experience/comfort) before confirming the slot | accepted |
| BC-BRAND-01    | Visual identity and voice follow [DESIGN.md](../DESIGN.md); lead-facing tone is Ukrainian-first, kind, and pressure-free | accepted |
| BC-DEMO-01     | The repo, a 1–2 min video, and a green `npm run evals` run are the homework's primary artifacts; every requirement is demonstrable locally | accepted |

## Out of scope (MVP)

- Payments, reminders, rescheduling of already-confirmed lessons
- Google Calendar or any external calendar integration
- Public deployment; anything requiring inbound connections or tunnels
- Voice messages, audio analysis, non-music subjects
- Multi-teacher scheduling; the school has exactly one teacher