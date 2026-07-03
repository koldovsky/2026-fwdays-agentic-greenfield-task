# ADR-0001: Local-first architecture — long polling, AG-UI transport, guardrails in code

- **Status:** Accepted
- **Date:** 2026-07-03
- **Deciders:** author + course requirements

## Context

Kamerton has two surfaces (a Telegram bot for leads, a dashboard for the
administrator) and a hard constraint: **fully local run with locally protected
secrets** (NFR-LOCAL-01, NFR-SEC-01). Business rules — minimum age 4, weekdays
10:00–20:00 only, voice lessons only — must hold even when the model misbehaves.
The homework also asks to demonstrate a UI protocol (AG-UI / A2UI) and
human-in-the-loop.

## Decision

```
 Parents/students               LOCAL MACHINE
┌──────────┐   long polling   ┌─────────────────────────────────────────┐
│ Telegram │◄────────────────►│ Bot (grammY)                            │
└──────────┘                  │   ▼                                     │
                              │ Agent Core ──► Claude API (Anthropic)   │
                              │   │  tools: answer_faq, log_question,   │
                              │   │         save_lead, save_profile,    │
                              │   │         get_slots, create_booking,  │
                              │   │         suggest_group               │
                              │   ├──► SQLite (leads, slots, bookings,  │
                              │   │           questions)                │
                              │   ▼  AG-UI events (SSE)                 │
                              │ Dashboard (Next.js + CopilotKit)        │
                              │   127.0.0.1:3000 — human-in-the-loop    │
                              └─────────────────────────────────────────┘
```

1. **No inbound connections.** Telegram via long polling (no webhook, no tunnel);
   the dashboard binds to `127.0.0.1`. The only outbound calls are the Telegram
   Bot API and the Anthropic API.
2. **AG-UI over SSE as the dashboard transport** (TC-PROTO-01). Events used:
   `RUN_STARTED/FINISHED`, `TEXT_MESSAGE_*` (streamed replies, FR-DASH-01),
   `TOOL_CALL_*` (developer panel, FR-DASH-02), `STATE_SNAPSHOT/DELTA` (request
   card), custom `BOOKING_PENDING` (renders the DecisionBar, FR-HITL-01). The
   admin decision returns via HTTP POST and triggers FR-HITL-02. A2UI payloads
   inside AG-UI events remain a future extension — the protocols are complementary.
3. **Guardrails live in deterministic code, not in the prompt.** Slots are
   pre-generated Mon–Fri, 10:00–19:00 starts (FR-GUARD-03); age is validated in
   `lib/` with an `AGE_BELOW_MIN` error (FR-GUARD-04); and the
   `bookings.status → 'confirmed'` transition exists **only** in the dashboard's
   admin handler — the agent's tool set physically contains no such operation
   (FR-GUARD-01). `lib/` is framework-free and fully unit-testable (TC-PURE-01).
4. **SQLite as the only store** (TC-DATA-01): `leads` (extended with the intake
   profile — `goal_tag`, `goal_text`, `tastes`, `dream_song`, `experience`,
   `comfort`, compiled into the first-lesson brief, FR-INTAKE-03..06), `slots`,
   `bookings` (with `decided_by`/`decided_at` as audit evidence for FR-GUARD-01),
   `groups`, and `questions` (`lead_id`, `text`, `answer_source: kb|unanswered`,
   `status`, `admin_answer`, `answered_at`) feeding the Question inbox
   (FR-KB-01/02). The `.db` file is gitignored (NFR-PRIV-01).
5. **The knowledge base has exactly two write paths, both human.** The teacher
   edits `knowledge/school.md` directly, or answers a question in the dashboard's
   Question inbox — that handler appends an entry to the file and marks the
   question `answered` (FR-KB-03). The agent's `log_question` tool only inserts
   into `questions`; no agent tool can touch `knowledge/school.md` (FR-GUARD-06) —
   the same maker ≠ checker shape as the booking confirmation.
6. **Conversation state machine** per chat:
   `greeting → qualifying → profiling → collecting → proposing → awaiting_admin → done`
   (`profiling` = the get-to-know questions: goal, tastes, experience,
   FR-INTAKE-03..05), with exits to `soft_decline` (age < 4), the scope
   explanation (BC-SCOPE-01/02), and off-topic steering (FR-GUARD-05). Every
   change streams as a `STATE_DELTA`.
7. **Secrets:** untracked `.env` (carrying only `TELEGRAM_BOT_TOKEN`) +
   committed `.env.example`; a gitleaks pre-commit hook blocks token leaks
   (TC-SEC-01). Anthropic auth resolves from the developer's local **user
   token** (`ant auth login` profile / `ANTHROPIC_AUTH_TOKEN`) — no Anthropic
   API key exists on disk in the repo (NFR-SEC-01).

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Long polling + localhost dashboard (chosen) | Zero inbound surface; no tunnels; trivially local | Polling latency (~1s) — irrelevant at this scale |
| Telegram webhook + ngrok/cloudflared tunnel | Push latency | Public URL contradicts NFR-LOCAL-01; tunnel secrets to manage |
| Telegram Mini App rendering AG-UI directly | One surface | Mini Apps require a public HTTPS URL — breaks the local constraint |
| Rules enforced in the system prompt only | Less code | A guardrail that can be argued with is not a guardrail; fails FR-GUARD-* |
| Postgres / cloud DB | Familiar ops | Needless infrastructure for a one-teacher school; breaks local-first |

## Consequences

- **Easier:** demoing (everything on one machine), securing (no attack surface),
  testing (pure `lib/`, deterministic slots), and explaining maker ≠ checker —
  the human approval is an architectural fact, not a convention.
- **Harder / accepted:** the machine must be on for the bot to answer; two leads
  wanting the same slot are serialized through `pending` and resolved by the
  human; group matching logic stays simple (±2 years) until real data says otherwise.