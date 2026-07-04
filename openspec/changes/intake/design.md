## Context

The baseline spec (`openspec/specs/intake/spec.md`) and ADR-0001 §6 already
settle *what* this capability does: a seven-state conversation machine with
two terminal/detour shapes, code-level age/format validation before any slot
is proposed, and a first-lesson brief compiled from free-text answers. What
is left open — because the baseline spec deliberately stays
implementation-agnostic — is *how* the state machine, the tool-use loop, and
the bot pipeline are actually shaped in code, and where the schema/testing
seams for a bot + LLM system without a UI live. Those are the five decisions
below. As with S1 `slots`, no requirement *text* changes; this change
implements the already-accepted baseline against real code.

## Goals / Non-Goals

**Goals:**
- Keep every guardrail-critical decision (age, format/scope, terminal vs.
  resumable) in a pure, synchronous `lib/` reducer that the agent's tools
  call through — never a decision the model can override by phrasing.
- Give the agent a *closed* tool set whose JSON schemas themselves encode
  the "code-vetted options" rule (enums for format/goal), so a guardrail is
  enforced twice: once by the schema, once by the `lib/` validator behind it
  (defense in depth, same spirit as FR-GUARD-01/03's static tool-set
  assertions).
- Make the state machine, the tool loop, and the bot pipeline each
  testable without a live Telegram chat or a live Anthropic call.

**Non-Goals:**
- Rendering any of this in the dashboard (S3) or reacting to an admin
  decision (S4) — this slice only produces `requests` rows in `awaiting_admin`
  and beyond conversation states are never written by *this* slice's tools.
- Answering FAQ-shaped questions or building the `questions` table
  (S5 `kb-learning`) — see Decision 2.
- Group matching (`FR-GROUP-01`, Future).

## Decisions

### Decision 1: the state machine is a pure reducer; detours never mutate the persisted state

`lib/src/intake/state-machine.ts` exports `transition(state: IntakeState,
event: IntakeEvent): TransitionResult`, a pure, synchronous reducer — no
I/O, no `Date.now()`-without-injection, no LLM call (TC-PURE-01).
`IntakeState = { conversationState, fields }`; `conversationState` is one of
`greeting | qualifying | profiling | collecting | proposing |
awaiting_admin | done | soft_decline` (ADR-0001 §6); `fields` holds only the
values the reducer has itself validated (`studentName`, `studentAge`,
`format`, `goalTag`, `goalText`, `tastes`, `dreamSong`, `experience`,
`comfort`, `preferredWeekdays`, `preferredTimeRange`).

**Field ownership per state**, enforced by the reducer rejecting an
out-of-state event with `error: "FIELD_NOT_OWNED_BY_STATE"` (never silently
ignored): `qualifying` owns name/age/format; `profiling` owns
goal/tastes/experience/comfort; `collecting` owns weekdays/time-range. An
`amend` event is the one exception — accepted in **any** non-terminal state
(FR-INTAKE-07's "any state before the administrator's decision"), re-running
the same field's validator and, if the new value fails it (e.g. an amended
age drops below 4), driving the same terminal transition a first-time
violation would.

**The real decision: are `scope_explanation` and `off_topic` states in the
enum, or side-channel signals?** Two options:

| | Detours as real enum states (e.g. `scope_explanation`, `off_topic`) | Detours as a `detour` field on `TransitionResult`, `conversationState` untouched (chosen) |
|---|---|---|
| Matches "resumable, returns to prior state" | Needs an explicit "remembered previous state" mechanism (a stack or a `returnTo` field) | Trivially true — the state never left, so "resuming" is a no-op by construction |
| Testability | Requires asserting a push/pop pair per detour | One assertion: `conversationState` before === after |
| Dashboard/AG-UI `STATE_DELTA` fidelity (S3) | A `scope_explanation` node is a visible timeline event by itself | Loses that as a distinct timeline node — mitigated below |
| Risk of drift | A forgotten "pop" leaves the conversation stuck in the detour state forever | None — nothing to forget |

**Chosen: side-channel `detour` field**, `TransitionResult = { state,
detour: "scope_violation" | "format_unsure" | null, error?: ErrorCode }`.
The lost dashboard timeline fidelity is mitigated by having the agent loop
(Decision 3) emit its own `TOOL_CALL_RESULT`/log entry for `explain_scope`/
`explain_format` tool calls — S3's event log already has a place for that
without needing a first-class FSM node. Off-topic steering (FR-GUARD-05)
does not even reach the reducer: it is recognized and answered entirely at
the agent-loop layer (Decision 3) without calling `transition()` at all, so
"state and fields preserved intact" is proven structurally (no mutation
call happened) rather than by a reducer test — the reducer's test suite
proves detours *that do* touch it (scope, format-unsure) are no-ops on
`conversationState`; the agent-loop test suite proves off-topic doesn't
call the reducer.

**Age/format validation gate:** `lib/src/intake/age.ts` exports
`validateAge(age: number): { ok: true; age } | { ok: false; code:
"AGE_BELOW_MIN" }` — deliberately narrow, matching the baseline spec's own
vocabulary (it names only `AGE_BELOW_MIN`). `lib/src/intake/format.ts`
exports `validateFormat(value: "individual" | "group" | "unsure" |
"instrument"): { ok: true; format } | { ok: false; code: "FORMAT_UNSURE" |
"SCOPE_VIOLATION" }`. Both are called by the reducer before a `save_*` event
is allowed to write its field — the spec's "before any slot is proposed"
guarantee holds by construction, since `proposing` is unreachable without
qualifying's fields having passed both validators.

**Where does text-to-number/text-to-enum normalization happen?** The
baseline spec's scenario ("їй сім" → 7) reads as if `lib/` does NLU. It does
not, and should not (TC-PURE-01 — a hand-rolled Ukrainian numeral dictionary
in `lib/` would duplicate what the model already does well, and drift from
real usage). **Decision:** the *model* is responsible for extracting a
candidate value before calling a tool; `save_age`'s JSON schema requires
`age: integer`, so the model cannot call it at all until it has resolved a
number. If the lead's answer is ambiguous, the model does not call the tool
— it asks a clarifying question as ordinary text, which is exactly the
baseline spec's "Non-numeric or ambiguous age is re-asked" scenario, with no
state mutation. `validateAge`'s only remaining job is the guardrail range
check (`AGE_BELOW_MIN`), which the model cannot talk its way around even if
it insists a 3-year-old is fine — the same "guardrails live in code, not
the prompt" shape as S1's grid/rank functions.

### Decision 2: the agent's tool set is closed; FAQ-shaped questions get a deterministic fallback, not a stub

Tool set for this slice: `save_name`, `save_age`, `save_format` (enum
`individual|group|unsure|instrument`), `save_goal` (enum tag +
verbatim text), `skip_goal`, `save_tastes`, `skip_tastes`,
`save_experience_comfort`, `save_weekdays`, `save_time_range`,
`amend_field`, `cancel_request`, `explain_scope`, `explain_format`,
`propose_slots` (wraps S1's `proposeSlots`), `request_hold` (wraps S1's
`holdWithRecovery`). Every enum-shaped tool parameter is the "model only
picks from code-vetted options" mechanism named in AGENTS.md, checked twice
(schema + `lib/` validator).

**The real decision: what happens to `log_question`/`answer_faq`?** The
prompt brief names them as a possible stub. Two options: (a) add stub tools
now that S5 replaces later, or (b) omit them entirely from this slice's tool
set and rely on a deterministic fallback reply for anything FAQ-shaped.
**Chosen: (b).** A half-built KB feature (a `log_question` tool with no
`questions` table to write to, since that table is S5's schema task) is
worse than not having it: it either silently no-ops (a guardrail smell —
"deterministic tool-result logging" would have nothing real to log) or
forces this slice to build S5's schema early, out of slice-DAG order. The
static system prompt instead tells the model that pricing/logistics/
schedule-detail questions outside the qualifying/profiling/collecting flow
get one deterministic sentence — "адміністратор уточнить" (the same
"promise" wording FR-FAQ-02 will formalize in S5) — composed without a tool
call and **not persisted anywhere** in this slice. This is a named, tracked
gap: S5 owns retroactively wiring real logging; nothing here should be
mistaken for that feature shipping early.

**Model config (TC-STACK-02, NFR-UX-01):** `claude-sonnet-5`, extended
thinking **disabled** (`thinking: { type: "disabled" }` — intake turns are
single-field extraction/validation, not multi-step reasoning, and the p90
≤ 5s budget has no room for a thinking pass), auth via
`ANTHROPIC_AUTH_TOKEN`/the local user-token profile only — never an API key
on disk (NFR-SEC-01, same as S1's Google service-account discipline but for
a different secret class). A fixed `MODEL_CONFIG` constant is asserted by a
config test, not exercised only informally.

**Deterministic tool-result logging (ADR-0001 §5 analog):** every tool call
result is appended to an in-process log via one function the loop always
calls, independent of what the model's final text says — so a `requests`
row reflects only validator-approved data even if the model's reply
narrates something it didn't actually do. This mirrors ADR-0001 §5's
"question logging is deterministic, not model-discretionary" principle,
applied to field-saving instead of KB writes.

### Decision 3: grammY pipeline — immediate ack, agent only for free text

`packages/bot`'s update handler: (1) `sendChatAction("typing")`
**immediately**, before touching state or calling the agent (NFR-UX-01,
the intake baseline spec's own "Immediate typing acknowledgement"
requirement); (2) if the update is a button callback (slot chip, or a goal
option button per DESIGN.md's "words, not emoji" buttons), resolve it
**without an agent call** — the callback payload is a code-vetted index/tag
chosen entirely by the bot's own keyboard, so routing it through the model
would add latency and a guardrail surface for no benefit; (3) if the update
is free text, call the agent loop (Decision 2). This split is the reason
NFR-UX-01's ack is a *bot* guarantee, not an agent-loop one — the ack fires
before step (2)/(3) even begins.

Ukrainian-only replies (BC-LANG-01) and DESIGN.md's inline-keyboard slot/
goal "tickets" are bot-layer rendering concerns; the agent loop only
produces the reply *text* and the caller wraps buttons around it when the
current state calls for a keyboard (proposing → slot chips; format/goal
questions → text-button options that still allow free text, so the loop
must not assume a callback is the only path). NFR-REL-01 apology-and-retry
copy for Telegram-send failures lives in `packages/bot/src/apology.ts`
(mirroring S1's `propose.ts` convention of placing the apology constant
next to the failure it apologizes for, not in a generic shared file); the
symmetric Anthropic-call-failure apology lives in
`packages/agent/src/apology.ts`. Both are plain string literals, zero I/O,
unit-tested directly — no LLM call is ever needed to apologize.

### Decision 4: schema — identity on `leads`, the full profile on `requests`, denormalized chat id for messaging

FR-INTAKE-08's own scenarios are the deciding evidence here: "a parent...
writes to book a trial for child B, age 6... the new request carries child
B's own profile (name, age, tastes)... child A's request and profile are
intact." Two same-handle requests can have **different** student names and
ages. That is only representable if name/age/format/profile live on
`requests`, not on `leads` — putting them on `leads` (as a first pass at
this brief literally proposed) would mean child B's data overwrites child
A's, contradicting the baseline spec's "profile lives on request not lead"
line verbatim. **Deviation from the literal brief, made deliberately and
recorded here:** `leads` carries identity only.

```sql
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_user_id TEXT NOT NULL UNIQUE,   -- FR-INTAKE-08 "known handle" lookup
  telegram_chat_id TEXT NOT NULL,
  telegram_display_name TEXT,              -- auto-captured, never asked (FR-INTAKE-01)
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  -- NFR-PRIV-02: deletable via the dashboard's admin action (S3); ON DELETE
  -- CASCADE on requests/bookings (and questions, once S5 adds it) makes the
  -- cascade a schema fact, not an application-level multi-statement delete.
);

CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  telegram_chat_id TEXT NOT NULL,   -- denormalized from leads at creation time
                                    -- (baseline spec: "stored on the request
                                    -- record" — lets S4/S5 message a lead by
                                    -- joining only on requests)
  state TEXT NOT NULL DEFAULT 'greeting'
    CHECK (state IN ('greeting','qualifying','profiling','collecting',
                      'proposing','awaiting_admin','done','soft_decline')),
  student_name TEXT,
  student_age INTEGER,
  format TEXT CHECK (format IN ('individual','group')),
  goal_tag TEXT CHECK (goal_tag IN ('karaoke','performance','confidence','hobby','other')),
  goal_text TEXT,
  tastes TEXT,
  dream_song TEXT,
  experience TEXT,
  comfort TEXT,
  preferred_weekdays TEXT,
  preferred_time_range TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_requests_lead_id ON requests(lead_id);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS request_id INTEGER
  REFERENCES requests(id) ON DELETE SET NULL;  -- S1's deferred column
```

`requests.state` is the **conversation** state (Decision 1's
`conversationState`) — deliberately not named `status`, so it can never be
confused with `bookings.status` (`pending/confirmed/declined/cancelled`),
the exact conflation the G2 revise pass already caught once ("`proposing`
is a conversation state, never a `bookings.status` value"). `openDatabase()`
now also runs `db.pragma("foreign_keys = ON")` so the `ON DELETE CASCADE`
clauses actually fire (better-sqlite3/SQLite default this pragma off per
connection). `questions` is explicitly **not** created here — S5 owns that
table and its own migration task.

### Decision 5: testing seams — two fake ports, real SQLite, a tiny real-Anthropic smoke

Two narrow interfaces make the whole slice testable without a live chat or
a live model call, mirroring S1's `CalendarPort` pattern:

- **`ModelPort`** (`packages/agent`): `send(messages, tools) ->
  Promise<ModelResponse>` (text and/or tool-use blocks). Production:
  `AnthropicModelPort` (the real SDK, local user token). Test:
  `FakeModelPort` — a scripted queue of responses, so a state-machine-driven
  conversation can be replayed deterministically in under a second.
- **`TelegramTransport`** (`packages/bot`): `sendChatAction`, `sendMessage`,
  `onMessage`. Production: a thin grammY adapter. Test:
  `FakeTelegramTransport` — records every call, lets a test simulate an
  inbound update and assert exact outbound call order (ack-before-reply,
  NFR-UX-01).

**Test layers:**
1. **Unit** (`lib/`, Vitest): the reducer, `validateAge`/`validateFormat`,
   `addressesParent`, and the guardrail copy constants — pure, no fakes
   needed at all.
2. **Agent-loop unit** (`packages/agent`, `FakeModelPort`): tool dispatch,
   the closed-tool-set static assertion (FR-GUARD-01/06), deterministic
   logging, off-topic pass-through (state untouched because `transition()`
   is never called).
3. **Integration** (`packages/bot` + real SQLite + both fakes,
   `tests/integration/intake/`): full conversation transcripts per scenario
   (happy path, age<4, piano detour, off-topic, amend, cancel, returning
   lead/sibling), asserting real `requests`/`leads` rows.
4. **Tiny real-Anthropic smoke** (`tests/integration/agent/smoke.test.ts`):
   one real round trip against `claude-sonnet-5` with local user-token auth,
   `describe.skipIf(no ANTHROPIC_AUTH_TOKEN/profile)` so it never blocks a
   machine without auth — kept intentionally small (one tool call asserted).
5. **E2E with real Telegram:** deferred to the QA-proof/demo recording
   stage (no dashboard surface exists yet to click through anyway).

## Risks / Trade-offs

- **[Risk]** Losing detours as first-class FSM states (Decision 1) could
  make S3's event log feel thin. → **Mitigation:** the agent loop logs
  `explain_scope`/`explain_format` tool calls as their own log entries
  regardless of `conversationState` movement; S3 renders the log, not the
  FSM enum, for its timeline.
- **[Risk]** Relying on the model to extract age/enum values before calling
  a tool (Decision 1) means a model that mis-extracts could store a wrong
  but "valid-looking" number (e.g. hears "7" instead of "seventeen").
  → **Mitigation:** the amend path (FR-INTAKE-07) exists precisely so a
  wrong value is one message away from being corrected; the guardrail that
  actually matters (never below 4) still can't be talked around.
- **[Risk]** Deviating from the brief's literal `leads(name, age, format)`
  schema (Decision 4) could look like scope creep if not flagged.
  → **Mitigation:** recorded here explicitly with the FR-INTAKE-08 sibling
  evidence; `tasks.md`'s schema task cites this decision by number.
- **[Risk]** Omitting `log_question`/`answer_faq` (Decision 2) means a real
  pricing question mid-MVP gets a canned line instead of a KB answer until
  S5 ships. → **Mitigation:** this is the same ownership boundary the
  signed slice DAG already draws (S5 depends on S2, not the reverse); the
  fallback line matches FR-FAQ-02's eventual wording so the lead experience
  doesn't regress when S5 lands.
- **[Risk]** `PRAGMA foreign_keys = ON` is per-connection in SQLite — a
  future module opening its own connection without this pragma would
  silently lose cascade-delete behavior. → **Mitigation:** `openDatabase()`
  is the *only* touchpoint (TC-DATA-01); the pragma is set once there, and
  a schema test asserts it's active.
