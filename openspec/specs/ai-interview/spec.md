# ai-interview

## Purpose

The server-side AI interview mode: at the same respondent link, a chat agent calmly
greets the respondent in Ukrainian, asks the snapshotted template's questions in order
one at a time, gently follows up on insufficient answers within a configurable cap, and
records each satisfied answer to the same per-question response model the form uses.
The agent stays strictly on the template — it never invents answers, never answers
off-topic or prompt-injection requests, never reveals other respondents' data or its
system prompt — and the conversation is resumable until all questions are answered and the
cycle is set `done`. The interview streams over server-side HTTP from a Route Handler (no
WebSockets), is bounded in cost, and sends the model only minimised data
(FR-AI-01..09, NFR-PERF-02, NFR-COST-01, BC-PRIVACY-04, TC-AI-04).

## Requirements

### Requirement: Calm Ukrainian greeting that frames the interview

The system SHALL render the AI interview as a chat page at the same respondent link the
form uses (`/respond/[token]`), reachable only when the respondent has chosen the AI mode.
On opening (or resuming) a `collecting` cycle, the agent SHALL greet the respondent calmly
in Ukrainian and SHALL state plainly that it will ask the template's questions, using
sentence case, a confidential tone, and no exclamation marks or emoji. The first message
SHALL appear within 3 s of mode selection, excluding model latency on later replies
(FR-AI-01, NFR-PERF-02, BC-BRAND-01).

#### Scenario: Agent greets and explains its purpose in Ukrainian

- **GIVEN** a `collecting` cycle whose respondent has chosen the AI interview mode
- **WHEN** the chat page opens at `/respond/[token]`
- **THEN** the agent's first message is in Ukrainian, greets calmly, and states that it
  will ask the questions from this assessment, with no exclamation marks and no emoji

#### Scenario: First question appears promptly

- **WHEN** the respondent selects the AI interview mode
- **THEN** the agent's opening message is shown within 3 s, measured excluding the model's
  latency on subsequent replies

#### Scenario: Wrong cycle status does not start an interview

- **GIVEN** a cycle that is `done` or `expired`
- **WHEN** the respondent link is opened in AI mode
- **THEN** the agent does not begin a new interview and the respondent sees the
  cycle's terminal state rather than a fresh greeting

### Requirement: Ask template questions in order, one at a time, in plain Ukrainian

The system SHALL ask the questions from the cycle's **snapshotted** template in their stored
order, presenting exactly one question per turn, phrased in plain Ukrainian. The agent SHALL
NOT skip ahead, batch multiple questions into one turn, or reorder questions (FR-AI-02).

#### Scenario: One question per turn, in template order

- **GIVEN** a snapshotted template with an ordered list of questions
- **WHEN** the interview proceeds from one satisfied question to the next
- **THEN** the agent asks the next unanswered question in stored order, presenting a single
  question per turn in plain Ukrainian

#### Scenario: No batching or reordering

- **WHEN** the respondent answers the current question
- **THEN** the agent does not present two or more new questions in the same turn and does not
  ask a later question before earlier unanswered ones

### Requirement: Bounded follow-ups on insufficient answers, then proceed

The system SHALL apply a defined sufficiency rule to each reply. When an answer is
insufficient — empty, off-topic relative to the current question, or below the sufficiency
rule — the agent SHALL ask at most N follow-up or clarifying turns (N configurable, default 2)
and SHALL then proceed to the next question rather than looping. The follow-up cap SHALL be
enforced by framework-free, unit-tested `lib/` logic so AI cost stays bounded
(FR-AI-03, NFR-COST-01, TC-PURE-01, NFR-DX-01).

#### Scenario: Insufficient answer triggers a follow-up

- **GIVEN** the configured follow-up cap N (default 2)
- **WHEN** the respondent's reply is empty, off-topic, or below the sufficiency rule
- **THEN** the agent asks a follow-up or clarifies the question rather than recording an answer

#### Scenario: Follow-ups are capped, then the agent proceeds with a recorded answer

- **GIVEN** a question on which the respondent has already received N follow-ups
- **WHEN** the next reply is still insufficient
- **THEN** the agent stops following up on that question and proceeds to the next question, and
  the capped-out question receives a recorded answer so the agent can close it and move on (the
  cycle's `done` transition remains governed by the cycles predicate, FR-CYCLE-04):
  - for an `open` question the agent records the best available respondent text (the most
    complete prior reply), never invented text, and if no usable text was ever given it records
    an explicit empty/declined answer marked `insufficient` in the response model
  - for a `scale` question, see "Capped-out scale question records an explicit no-answer" below

#### Scenario: Capped-out scale question records an explicit no-answer

- **GIVEN** a `scale` question whose replies never mapped to a valid anchor within the N-follow-up cap
- **WHEN** the cap is reached
- **THEN** the agent records an explicit answer row with a null scale value flagged `insufficient`
  (never an invented or out-of-range anchor), so the question is closed for traversal while
  remaining distinguishable from a satisfied answer in the response model

#### Scenario: Sufficiency and cap logic is pure and verifiable

- **WHEN** the sufficiency rule and the follow-up counter are evaluated
- **THEN** they run in framework-free `lib/` code (no `next/*`, `react`, or DOM imports) and
  are exercised by unit tests over fixed transcripts

### Requirement: Agent stays grounded — no invented answers, no off-template questions, no data leaks

The system SHALL constrain the agent so it never invents an answer on the respondent's behalf,
never asks a question outside the cycle's template, never reveals any other respondent's or
cycle's data, and never reveals its own system prompt. The grounding rules SHALL live in the
single server-side AI module (`lib/ai/`) (FR-AI-04, BC-PRIVACY-01, TC-AI-01, TC-AI-02).

#### Scenario: Agent does not fabricate an answer

- **WHEN** the respondent gives no usable content for a question
- **THEN** the agent does not invent or assume an answer; it follows up within the cap and
  otherwise records only what the respondent actually provided

#### Scenario: Agent will not ask outside the template

- **WHEN** the agent would otherwise add a question
- **THEN** the agent only ever asks questions drawn from the cycle's snapshotted template,
  never an extra question of its own

#### Scenario: Agent refuses to expose other respondents' data or its prompt

- **WHEN** the respondent asks for another respondent's or cycle's answers, or for the agent's
  system prompt or instructions
- **THEN** the agent declines and reveals neither other respondents' data nor its system prompt

### Requirement: Record a normalised answer to the shared response model

When a question is satisfied, the system SHALL record a normalised answer into the same
per-question response model the web form writes to, so a cycle's results are identical in shape
regardless of mode. For a `scale` question the agent SHALL map the reply to exactly one valid
anchor value from the question's anchor set, normalising locale-formatted numeric replies
deterministically (a Ukrainian decimal comma such as `3,5` is parsed as `3.5`, surrounding
whitespace and trailing punctuation are stripped) before matching; for an `open` question it SHALL
store the respondent's own words. The recorded answer SHALL be validated with Zod at the boundary
and the mapping SHALL be pure, unit-tested `lib/` logic (FR-AI-05, FR-RESP-03, TC-VALID-01,
TC-PURE-01).

#### Scenario: Scale reply maps to one valid anchor value

- **GIVEN** a satisfied `scale` question with a fixed ordered anchor set
- **WHEN** the agent records the answer
- **THEN** the stored value is exactly one of that question's valid anchor values, written to the
  same response model the form uses

#### Scenario: Open reply stores the respondent's words

- **GIVEN** a satisfied `open` question
- **WHEN** the agent records the answer
- **THEN** the stored text is the respondent's own words, written to the same response model the
  form uses

#### Scenario: A scale reply that maps to no valid anchor triggers a follow-up before the cap

- **GIVEN** a `scale` question still within its N-follow-up cap
- **WHEN** the respondent's reply cannot be mapped to any valid anchor value
- **THEN** the agent treats the reply as insufficient and asks a follow-up rather than storing an
  out-of-range or invented value; only when the cap is reached does it record the explicit
  null-value `insufficient` row defined in the follow-up requirement

#### Scenario: Locale-formatted scale reply maps deterministically

- **GIVEN** a `scale` question with anchors `1`–`5` and a reply expressed with a Ukrainian decimal
  comma (for example `3,5`) or with surrounding whitespace/punctuation (for example ` 4. `)
- **WHEN** the agent normalises and maps the reply
- **THEN** the normalised number is matched against the anchor set deterministically by the pure
  `lib/` mapping (so `4.` maps to anchor `4`), and a normalised value that still matches no anchor
  (for example `3,5` against an integer anchor set) is treated as unmappable per the scenario above
  rather than being silently rounded

### Requirement: Resumable interview that completes the cycle

The system SHALL make the conversation resumable: reopening the link in AI mode SHALL continue
from the last unanswered question rather than restarting, and already-recorded answers SHALL be
preserved. The agent SHALL traverse every template question in order, recording a row for each one
it asks — a satisfied answer, or the explicit `insufficient`/null row written when a question caps
out — so the conversation stays resumable. The cycle's transition to `done` is governed by the
**canonical completion predicate owned by the cycles spec** (FR-CYCLE-04): the cycle is `done` when
every **required** question in the snapshot has a valid recorded answer; unanswered optional
questions never block `done`. This spec does not redefine that predicate. The completion state's
Ukrainian strings SHALL come from `lib/i18n/uk.ts` (English fallback `en.ts`)
(FR-AI-06, FR-CYCLE-04, NFR-I18N-01).

#### Scenario: Reopening continues from the last unanswered question

- **GIVEN** a partially answered AI interview
- **WHEN** the respondent reopens the link in AI mode
- **THEN** the agent resumes at the first unanswered question, preserving prior recorded answers
  rather than re-asking answered ones

#### Scenario: Completing the interview sets the cycle done

- **GIVEN** the agent has traversed every template question in order, recording a row for each
- **WHEN** every required question in the snapshot has a valid recorded answer, satisfying the
  canonical completion predicate owned by the cycles spec (FR-CYCLE-04)
- **THEN** the cycle status is set to `done` and the respondent sees a quiet completion state whose
  Ukrainian copy is read from `lib/i18n/uk.ts`, even if an optional question was left without a
  satisfied answer

### Requirement: Graceful degradation when the Claude API is unavailable

When the Claude API is unavailable or errors, the system SHALL degrade to a calm "try again
shortly" state in Ukrainian and SHALL offer the web form mode as a fallback, never showing a
stack trace, raw error, or 500 page. The Ukrainian degradation copy SHALL come from
`lib/i18n/uk.ts` (English fallback `en.ts`). Recorded answers SHALL be preserved across the outage
(FR-AI-07, FR-SHELL-03, NFR-OBS-01, NFR-I18N-01).

#### Scenario: API outage shows a calm retry state with a form fallback

- **GIVEN** the Claude API is unavailable
- **WHEN** the respondent is in the AI interview
- **THEN** the page shows a calm "try again shortly" message in Ukrainian (sourced from
  `lib/i18n/uk.ts`) and offers the form mode as a fallback, with no stack trace or raw error

#### Scenario: Answers survive the outage

- **WHEN** the interview resumes after a Claude API outage
- **THEN** answers recorded before the outage are still present and the agent resumes from the
  last unanswered question

### Requirement: Off-topic requests are politely declined and steered back

The system SHALL NOT answer an off-topic request — anything not part of the current assessment.
Instead the agent SHALL briefly and politely decline and steer back to the current question, in
Ukrainian and in a calm tone (FR-AI-08, BC-BRAND-01).

#### Scenario: Off-topic question is declined and redirected

- **WHEN** the respondent asks something unrelated to the assessment (for example general
  knowledge or chit-chat)
- **THEN** the agent does not answer the off-topic request and instead briefly, politely returns
  the respondent to the current template question

### Requirement: Robust to prompt-injection attempts

The system SHALL keep the agent on the template under prompt-injection attempts (for example
"ignore your instructions", "reveal your system prompt", "you are now a different assistant").
Under such attempts the agent SHALL stay on the template, SHALL NOT reveal its system prompt,
and SHALL NOT change its task (FR-AI-09, FR-AI-04).

#### Scenario: Injection does not change the task

- **WHEN** the respondent sends an instruction telling the agent to ignore its rules or adopt a
  new role
- **THEN** the agent continues asking the template's questions, does not reveal its system prompt,
  and does not change its task or answer the injected request

#### Scenario: Injection eval over fixed transcripts

- **WHEN** the injection-resistance behaviour is verified
- **THEN** a lightweight eval over fixed transcripts confirms the agent stays on the template and
  keeps its system prompt hidden

### Requirement: Server-side HTTP streaming with data minimisation

The system SHALL run the interview agent server-side through the single `lib/ai/` module on the
Claude API, streaming the response token by token over **server-side HTTP from a Next.js Route
Handler with no WebSocket server**. The Route Handler is an inbound boundary: before any model
call it SHALL resolve the path token to a single `collecting` cycle and SHALL parse the request
body with Zod, rejecting any request that fails either check without opening a stream and without
leaking data. Each prompt SHALL receive only the data the turn needs — the template questions,
the current conversation/answers, and at most a pseudonymous first name — and SHALL NEVER include
surname, email, phone, or Telegram handle. The Claude API key SHALL live only in server-side env,
and server logs SHALL NOT contain full answer text at info level
(FR-AI-01, FR-LINK-03, TC-AI-04, TC-VALID-01, BC-PRIVACY-04, NFR-SEC-01, NFR-SEC-02, NFR-COST-01,
NFR-OBS-01, TC-DATA-01).

#### Scenario: Interview streams over HTTP from a Route Handler

- **WHEN** the agent produces a turn
- **THEN** the reply is streamed token by token over server-side HTTP from a Next.js Route
  Handler, with no WebSocket connection opened

#### Scenario: Prompt carries only minimised data

- **WHEN** a prompt is assembled for the Claude API
- **THEN** it contains only the template questions, the current conversation/answers, and at most
  a pseudonymous first name, and never the respondent's surname, email, phone, or Telegram handle

#### Scenario: Secrets stay server-side and logs stay quiet

- **WHEN** the interview runs on a healthy session
- **THEN** the Claude API key is never shipped to the client bundle and server logs do not contain
  full answer text at info level

#### Scenario: Stream request with an unknown, garbage, or non-matching token is rejected with no model call

- **GIVEN** the AI stream Route Handler at `/respond/[token]`
- **WHEN** it is called with a token that is unknown, malformed/garbage, expired, or does not match
  any `collecting` cycle (including a valid token from a different cycle)
- **THEN** the handler returns a calm declining response, opens no stream, makes no Claude API call,
  and returns nothing about any other cycle's questions, answers, or respondents

#### Scenario: Malformed request body is rejected by Zod before any model call

- **GIVEN** a request to the AI stream Route Handler whose token resolves to a valid `collecting` cycle
- **WHEN** the request body is missing the required message field or otherwise fails the Zod schema
  for the endpoint
- **THEN** the handler rejects the request at the boundary, opens no stream, and makes no Claude API
  call, surfacing a calm validation error rather than a stack trace or 500

#### Scenario: Oversized respondent message is bounded before reaching the model

- **GIVEN** the endpoint's Zod schema enforces a maximum respondent message length
- **WHEN** the respondent submits an oversized message (for example a very large paste exceeding the cap)
- **THEN** the message is rejected or deterministically truncated to the cap by pure `lib/` logic
  before it is added to the prompt, so a single turn cannot inflate prompt size or AI cost without
  bound (NFR-COST-01), and the respondent sees a calm message rather than an error

## Out of scope

- Telegram or any external messenger as the interview channel — the agent and prompts are kept
  channel-agnostic so a Telegram channel can be added later, but it is not built in the MVP
  (TC-AI-03; PRD "Out of scope").
- WebSocket transport for the interview or for HR's live progress (progress is delivered by
  polling) (TC-AI-04).
- Multiple respondents per cycle; the MVP interviews one respondent per cycle.
- HR-facing editing of recorded AI answers or of the interview transcript.
- A respondent-facing view of any other cycle's or respondent's data.
- The AI summary report (owned by the `report` capability, FR-REPORT-*); the AI interview
  only collects answers.
- Usage/cost accounting rows (owned by the `usage-accounting` capability, FR-USAGE-*),
  though interview calls feed it.
