## ADDED Requirements

Requirement text is authoritative in [`docs/requirements.md`](../../../../../docs/requirements.md);
each requirement below cites its stable FR id and restates the behavior in SHALL form as the OpenSpec
contract. **Every value — the model ids, the token budget, the grounding rules, the output shape, and
the provider/failure ladder — is fixed by architecture §4 (the coach/LLM contract) and §2.1 (the data
model); this contract references those sections and never re-derives a number.** The metrics snapshot
the coach reads is the **shipped** slice-004 `SnapshotResponse` (`app/schemas/stats.py`, the payload of
`GET /api/stats/snapshot`), not the illustrative §4.1 JSON sketch; the coach obtains it from the **same**
builder the Stats UI uses (`app/services/stats.py::StatsService.get_snapshot`, which calls the pure
`app/core/snapshot.py::build_snapshot`) and re-derives no number. Raw session rows never enter the prompt
(FR-COACH-04). Coach output carries no emoji (NFR-DES-01). All repository access is user_id-scoped
(FR-AUTH-07). There is **one** provider/degradation ladder (architecture §4.4 grounding + §4.5 provider),
encoded identically in FR-COACH-02 and FR-COACH-07: primary `gemma-4-31b-it` -> grounding-validate; on a
grounding violation, one corrective retry on `gemma-4-31b-it`; on a second grounding failure, a transport
error, or schema-invalid JSON, a single `Gemini 3 Flash` attempt; then the defined fallback card (the
§4.4 terminal state). Scenarios map one-to-one to the acceptance tests the test-engineer will write
test-first (RED). This is the **backend coach + eval suite**; the React coach drawer / floating button
(DESIGN §7.5, FR-SHELL-02) is a later shell slice and is out of scope here.

### Requirement: Weekly insight card (FR-COACH-01)
The system SHALL generate, for the authenticated user's **current week** (user-TZ Monday 00:00 -> now,
architecture §4.1), an insight card in the fixed architecture §4.2 structure. `POST /api/coach/insight`
SHALL be **read-through** against the `coach_insights` cache (architecture §2.1, NFR-COST-01): if a row
already exists for `(user_id, current-week Monday)` it SHALL be returned **with no LLM call**; on a miss
the card SHALL be generated and returned, and **only a grounded, non-fallback card — including a quiet
card — SHALL be upserted** into `coach_insights`. If generation runs the FR-COACH-07 ladder and
terminates in the **fallback card**, that fallback card SHALL be **returned but NOT upserted** — the same
both-or-neither default FR-COACH-03 establishes for chat: because v1 does not auto-regenerate mid-week,
caching a "coach unavailable" fallback under `UNIQUE(user_id, week_start)` would serve that fallback for
the **whole week** even after the model recovers, so a transient failure instead **self-heals** and the
next same-week request **re-attempts** generation rather than serving a cached fallback. The stored
`week_start` SHALL be the snapshot's `window.start` — the same builder's user-TZ Monday (architecture
§4.1/§2.1) — one cached row per user per week (`UNIQUE(user_id, week_start)`). v1 does **not**
auto-regenerate mid-week; an explicit refresh is out of scope (a later shell slice, FR-SHELL-02). A generated card SHALL
contain **2-4 short observations and 1-2 concrete recommendations**, and the structured-output contract
SHALL constrain those counts (architecture §4.2, "JSON Schema enforced"); when nothing in the snapshot
warrants advice the card SHALL instead be **quiet** (`quiet: true`) with **exactly one** short
observation and **no** recommendation rather than inventing advice. A model response whose counts fall
outside these bounds (given its `quiet` flag) is treated as **schema-invalid** and routed into the
degradation ladder (FR-COACH-07), never returned as-is.

#### Scenario: A notable week yields 2-4 observations and 1-2 recommendations, cached for the week
- **GIVEN** an authenticated user whose current-week snapshot has notable activity and no cached insight for the current week
- **WHEN** the client POSTs `/api/coach/insight`
- **THEN** the response is the §4.2 structured card with `quiet: false`, **between 2 and 4** `observations` and **between 1 and 2** `recommendations`, and a `coach_insights` row is upserted for `(user_id, week_start)` where `week_start` equals the snapshot's `window.start` (the user-TZ Monday, architecture §2.1/§4.1)

#### Scenario: A cached insight is returned in the same week without a second LLM call
- **GIVEN** an authenticated user who already has a `coach_insights` row for the current week
- **WHEN** the client POSTs `/api/coach/insight` again in the same week
- **THEN** the cached card is returned and **no** LLM call is made (read-through cache; v1 does not auto-regenerate mid-week), honoring the free-tier budget (NFR-COST-01, architecture §2.1)

#### Scenario: A degraded insight is returned but not cached, and self-heals on the next same-week request
- **GIVEN** an authenticated user with **no** cached insight for the current week AND a generation attempt whose model calls run the FR-COACH-07 ladder and terminate in the **fallback card**
- **WHEN** the client POSTs `/api/coach/insight`
- **THEN** the fallback card is **returned** but **nothing is upserted** to `coach_insights` (only a grounded, non-fallback card — including a quiet card — is cached), and a **subsequent same-week** `POST /api/coach/insight` **re-attempts** generation (it does not serve a cached fallback) — so a transient failure self-heals (FR-COACH-01, symmetric with FR-COACH-03's both-or-neither rule)

#### Scenario: A week with nothing notable is quiet, not invented advice
- **GIVEN** an authenticated user whose current-week snapshot warrants no advice
- **WHEN** the insight is generated
- **THEN** the card is `quiet: true` with **exactly one** short observation and **no** recommendation, saying so briefly rather than fabricating advice, and the **server-returned** payload additionally carries the server-set fallback marker set to **`false`** (the model-facing structured-output schema remains exactly the 4 §4.2 fields) — so a normal quiet card is distinguishable from the fallback card by the marker's value (FR-COACH-01/05, architecture §4.2)

#### Scenario: Out-of-range observation/recommendation counts are treated as schema-invalid
- **GIVEN** a model response for an insight whose counts fall outside the contract (e.g. `quiet: false` with **5** observations, or a `quiet: true` card that carries a recommendation)
- **WHEN** the coach validates the response against the §4.2 structured-output contract
- **THEN** the out-of-range response is treated as **schema-invalid** and routed into the degradation ladder (FR-COACH-07) — never shown as-is (architecture §4.2 "JSON Schema enforced", FR-COACH-01)

#### Scenario: An empty week is handled gracefully (E-1)
- **GIVEN** an authenticated user with no saved sessions whose snapshot is the metrics slice's well-defined all-zero snapshot (E-1)
- **WHEN** the insight is generated
- **THEN** it returns a valid §4.2 structured card (not an uncaught error) and fabricates no activity number — the empty snapshot's allowed-number set is only the snapshot's zero/empty leaves plus the exempt bare small integers — because the coach handles the empty snapshot gracefully (E-1)

### Requirement: Grounding — no number absent from the snapshot (FR-COACH-02)
The system SHALL enforce grounding by **programmatic post-validation** in the pure, unit-testable
`app/core/grounding.py` (architecture §4.4, resolving O-7). It **(1)** builds the **allowed-number set**
deterministically from the leaves of the **real** `SnapshotResponse` (`app/schemas/stats.py`) so that two
implementers derive the identical set: **every numeric leaf** — `window.days`;
`volume.today_min/week_min/month_min/all_time_min/daily_avg_30d_min` and each `volume.per_day[].min`;
`consistency.score/regularity/start_stability` (when non-null); `focus.deep_count/deep_minutes/deep_share`;
each `switching.per_day[].switches/interruptions/switch_load` and `switching.baseline_mean`;
`streaks.current/longest`; each `baselines.*.value` and `baselines.*.delta` (when non-null); each
`top_categories[].id/week_min`; and each `per_category_per_day[].id` and `per_category_per_day[].per_day[].min`
— is allowed at **fixed granularities**: for each numeric leaf value `v`, the **raw `v`**, **`round(v)`**
(rounded integer), and **`round(v, 1)`** (one-decimal) — the §4.4 catch-all. **Share-typed** leaves
(`focus.deep_share`, and **both** `baselines.focus_share.value` and `baselines.focus_share.delta`) are
**additionally** allowed in **percent** form at both granularities — **`round(v*100)`** and
**`round(v*100, 1)`** — so a non-clean share such as `0.4295` grounds `{43, 43.0}` (i.e. "43%"/"43") and a
`baselines.focus_share.delta` of `0.05` grounds `5` ("up 5%"). **Minute-typed** leaves — every `*_min`, `focus.deep_minutes`,
`volume.daily_avg_30d_min`, every `per_day[].min`, `top_categories[].week_min` (a weekly-minutes
quantity), **and both** `baselines.volume.value` and `baselines.volume.delta` (a daily-average-minutes
quantity) — are **additionally** allowed in **`h:mm`** form computed from **both** `floor(v)` **and**
`round(v)` minutes (so a fractional `daily_avg_30d_min` of `74.6` grounds both `1:14` and `1:15`; a clean
`262` grounds `4:22`; a `baselines.volume.value` of `74` grounds `1:14`). The remaining `baselines.*`
leaves — `baselines.consistency.{value,delta}` (a 0-100 score) and `baselines.switch_load.{value,delta}`
(a switch-load figure) — are **plain numeric**: they get **only** the catch-all raw/`round(v)`/`round(v, 1)`
renderings and **no** percent or `h:mm` form (a score and a load are neither a share nor minutes), so
**every `baselines.*` leaf is classified by its unit and none is left to a glob**. The **local-time** leaf
`consistency.median_start_local` (when non-null) is allowed as its **`HH:MM`** literal. **Where a rounding choice exists the allowed set includes BOTH the floored and
the rounded rendering**, so the derived forms are fully deterministic (two implementers derive the
identical set) yet never reject a legitimate rendering — the intent is to catch fabrications, not to pick
one rounding. **Date components** (`window.start`, `window.end`, and every `per_day[].date`) are **dates,
not numeric-grounding tokens**, excluded from numeric extraction on both the snapshot and the output side;
finally, any numbers present in the user's current chat message (chat path) are **also** allowed. It then
**(2)** extracts numeric tokens (integers, decimals, percents, `h:mm` times) from the coach output,
**(3)** **exempts bare integers 0-9 without units** (architecture §4.4 item
3), and **(4)** treats any remaining number not in the allowed set as a **grounding violation**. On a
violation the coach SHALL perform **exactly one** corrective retry on the primary model `gemma-4-31b-it`
(§4.4); if that retry still violates (a **second grounding failure**) it SHALL proceed along the single
provider ladder of FR-COACH-07 — a single `Gemini 3 Flash` attempt, then the defined fallback card —
never surfacing the fabricated number as trusted output and logging the violation (NFR-REL-01). This same
validator is the **CRITICAL** criterion of the coach output-eval suite.

#### Scenario: A number absent from the snapshot is caught (E-9)
- **GIVEN** a coach output whose text cites a unit-bearing number (e.g. `180 min`) that is not in the snapshot nor any of its derived renderings
- **WHEN** `app/core/grounding.py` validates the output against that snapshot
- **THEN** it reports a **grounding violation** and the number is not accepted as trusted output (E-9, FR-COACH-02) — the eval suite's CRITICAL criterion

#### Scenario: A snapshot value's derived rendering is allowed
- **GIVEN** a snapshot whose `focus.deep_share` is `0.43` and whose `focus.deep_minutes` is `262`
- **WHEN** the output renders these as `43%` and `4:22` (the percent form of the share and the `h:mm` rendering of the minutes)
- **THEN** the validator allows both, because derived renderings of snapshot numbers are in the allowed-number set (architecture §4.4)

#### Scenario: A non-clean share rendered as a rounded percent is grounded, not a violation
- **GIVEN** a snapshot whose `focus.deep_share` is a **non-clean fraction** ≈ `0.4295`
- **WHEN** the coach output cites it as "**43%**"
- **THEN** the validator treats `43` as **grounded (not a violation)**, because a share-typed leaf's allowed set includes the percent form at fixed granularities — `round(v*100)` and `round(v*100, 1)`, here `round(42.95) = 43` — and where a rounding choice exists the set includes **both** the floored and rounded rendering, so a legitimate rounded percent of an ordinary-week share is never flagged (architecture §4.4, FR-COACH-02)

#### Scenario: The allowed-number set is derived deterministically from the real snapshot leaves
- **GIVEN** a snapshot whose `consistency.median_start_local` is `"09:40"`, whose `baselines.focus_share.value` is `0.38`, and whose `window.start` is the date `2026-07-06`
- **WHEN** `app/core/grounding.py` builds the allowed-number set from the real `SnapshotResponse` leaves
- **THEN** the local-time literal `09:40` and the share's percent form `38%` are in the allowed set, while the date components of `window.start` (`2026`, `07`, `06`) are **excluded** from numeric extraction (dates are not citable numbers) — so the derivation is deterministic and two implementers derive the identical set (architecture §4.4)

#### Scenario: A null (low-confidence) consistency leaf is never cited as a number
- **GIVEN** a snapshot for a user with **< 3 active days** this week, so `consistency.score`, `consistency.regularity`, `consistency.start_stability`, and `consistency.median_start_local` are all **`null`** with `low_confidence: true` (architecture §3.2, the common first-week state)
- **WHEN** the coach builds the allowed-number set and validates output against it
- **THEN** the `null` consistency leaves contribute **no** number to the allowed set (the "when non-null" guards skip them) and the coach cites **no** consistency figure — it does not render a `null` leaf as `0` or any other number, and it does not crash (FR-COACH-02/07, architecture §3.2)

#### Scenario: Bare small integers without units are exempt
- **GIVEN** a coach output containing a bare integer 0-9 with no unit that is absent from the snapshot (e.g. "your 8 deep blocks")
- **WHEN** the validator runs
- **THEN** the extractor emits the token `8` but the validator does **not** flag it, because bare integers 0-9 without units are exempt (architecture §4.4 item 3); a spelled-out number ("eight") yields no digit token and is likewise never flagged

#### Scenario: One corrective retry, then the provider ladder, precedes any fallback card
- **GIVEN** a first coach output from `gemma-4-31b-it` that contains a fabricated, out-of-snapshot number
- **WHEN** grounding validation fails
- **THEN** the coach issues **exactly one** corrective retry on `gemma-4-31b-it`; if that retry still violates (a second grounding failure) it makes a single attempt on `Gemini 3 Flash`, and only if that also violates/fails returns the defined fallback card — the fabricated output is never returned to the user (architecture §4.4/§4.5, matching FR-COACH-07)

### Requirement: Grounded chat answers with memory (FR-COACH-03)
The system SHALL answer a user's chat question via `POST /api/coach/chat`, **grounded in the current
metrics snapshot and the user's stored per-user conversation history**, returning the §4.2 structured
reply. The reply SHALL pass the same grounding validation as the insight (FR-COACH-02). A **success** is
**any grounded, non-fallback reply from either model** — the primary `gemma-4-31b-it` (including after the
one corrective retry) **or** the `Gemini 3 Flash` fallback model — and on a success the system SHALL
persist **both** the user turn and the coach reply to `coach_messages` (one rolling thread per user,
architecture §2.1). Only when the reply degrades to the **terminal fallback card** (the provider ladder
exhausted) SHALL the system persist **neither** turn — no dangling user turn and no fabricated coach turn
— keeping the rolling thread clean (FR-COACH-07, architecture §4.3). The endpoint SHALL reject an **empty
or whitespace-only** `user_message` with **422**, and SHALL reject an **over-long** `user_message` (above a
**defensive maximum length**) with **422** as well — symmetric with the empty case, **rejected, not
clipped**, no LLM call — because the message is concatenated into the prompt and its numbers widen the
grounding allowed-number set (the same defensive-cap spirit as slice-004's `_MAX_SESSION_*` bounds).

#### Scenario: A chat question returns a grounded structured reply and stores both turns
- **GIVEN** an authenticated user with a metrics snapshot and prior conversation history
- **WHEN** the client POSTs `/api/coach/chat` with a non-empty question and the reply is a **grounded, non-fallback reply from either model** (the primary `gemma-4-31b-it` or the `Gemini 3 Flash` fallback model)
- **THEN** the response is a §4.2 structured reply grounded in the snapshot + history, and — because **any** such grounded reply is a **success** — a `user` row and a `coach` row are appended to that user's `coach_messages` thread (architecture §2.1)

#### Scenario: A corrective-retry success persists both turns
- **GIVEN** a chat turn whose first reply from `gemma-4-31b-it` cites an out-of-snapshot number but whose **one corrective retry** then returns a **grounded** reply (no `Gemini 3 Flash` attempt and no fallback card needed)
- **WHEN** the request completes
- **THEN** the grounded retry reply is a **success**: **both** the `user` turn and the `coach` reply are persisted to `coach_messages`, while the transient fabricated first output is **never** persisted nor surfaced (FR-COACH-03/07, architecture §4.3)

#### Scenario: A chat reply is grounded like the insight
- **GIVEN** a chat turn whose model reply would contain a number absent from both the snapshot and the user's message
- **WHEN** the reply is validated
- **THEN** the same grounding validator (FR-COACH-02, architecture §4.4) flags it, so a chat reply can never surface a fabricated number

#### Scenario: Chat history is isolated per user
- **GIVEN** conversation histories for user A and user B
- **WHEN** user A POSTs `/api/coach/chat`
- **THEN** the assembled history and the stored turns are only user A's, never user B's, because every coach repository method is user_id-scoped (FR-AUTH-07)

#### Scenario: A degraded chat persists neither turn
- **GIVEN** a chat request whose coach reply degrades to the fallback card (the provider ladder is exhausted)
- **WHEN** the request completes
- **THEN** **no** `coach_messages` row is written for that request — neither the user turn nor a coach turn — so the rolling thread carries no dangling user turn and no fabricated coach turn (FR-COACH-07, architecture §4.3)

#### Scenario: An empty chat message is rejected
- **GIVEN** an authenticated user
- **WHEN** the client POSTs `/api/coach/chat` with an empty or whitespace-only `user_message`
- **THEN** the request is rejected with **422** and no LLM call is made (an over-long `user_message` is likewise rejected with **422**, not clipped — see the dedicated over-long scenario)

#### Scenario: An over-long chat message is rejected with 422
- **GIVEN** an authenticated user
- **WHEN** the client POSTs `/api/coach/chat` with a `user_message` exceeding the **defensive maximum length** (≈ 2,000 characters)
- **THEN** the request is rejected with **422** — symmetric with the empty-message case — and **no** LLM call is made, because the over-long message is **rejected, not clipped** (FR-COACH-03)

### Requirement: Request assembly — snapshot + history only (FR-COACH-04)
The system SHALL assemble each coach request from **exactly two inputs** — (a) the current metrics
snapshot, obtained from the same builder the Stats UI uses
(`app/services/stats.py::StatsService.get_snapshot(user_id=…, window=None)`, which calls the pure
`app/core/snapshot.py::build_snapshot(...)`), and (b) the user's stored per-user conversation history
(prior turns from `coach_messages`) — **and nothing else**; raw session rows SHALL **never** be sent to
the LLM (FR-COACH-04, architecture §4.1). History SHALL be assembled **newest-first** up to the budget of
architecture §4.3: system prompt (~400 tokens) + snapshot (~600 tokens) + the most recent turns up to
**~2,000 tokens** (approximated as `len(chars)/4`), with a **hard cap of 20 turns**; older turns are
dropped with no summarization.

#### Scenario: The request contains the snapshot and history only, never raw session rows
- **GIVEN** an authenticated user with saved sessions and prior conversation turns
- **WHEN** a coach request is assembled
- **THEN** it contains the metrics snapshot and the stored conversation turns, and **no raw `sessions` or `pause_segments` row** is included (FR-COACH-04, architecture §4.1)

#### Scenario: The coach's snapshot is the same artifact the Stats UI shows
- **GIVEN** an authenticated user
- **WHEN** the coach builds its snapshot
- **THEN** it is produced by `StatsService.get_snapshot(user_id=…, window=None)` / `build_snapshot(...)` — the same builder behind `GET /api/stats/snapshot` — so what the UI shows and what the coach sees are one artifact, and the coach re-derives no number (architecture §4.1)

#### Scenario: History is trimmed newest-first to 20 turns
- **GIVEN** a user whose `coach_messages` thread holds more than 20 turns
- **WHEN** the request history is assembled
- **THEN** only the most recent turns are included, newest-first, bounded by the **hard cap of 20 turns**, with older turns dropped and not summarized (architecture §4.3)

#### Scenario: History is trimmed to the ~2,000-token budget, oldest dropped first
- **GIVEN** a user with **at most 20** stored turns whose combined size nonetheless exceeds the **~2,000-token** history budget (approximated as `len(chars)/4`, architecture §4.3)
- **WHEN** the request is assembled
- **THEN** the **oldest** turns are dropped newest-first until the history fits within ~2,000 tokens (the exact crossing turn need not be pinned) with no summarization — so both the 20-turn cap **and** the token budget bound the history (architecture §4.3)

### Requirement: Fixed-shape structured output (FR-COACH-05)
The system SHALL return coach output as a **fixed-shape structured JSON payload** conforming to
architecture §4.2 — `{"language": "en"|"uk", "quiet": bool, "observations": [{"text": str, "metric_refs":
[str]}], "recommendations": [{"text": str, "metric_refs": [str]}]}` — for **both** the insight card and
chat replies, rendered as cards rather than free-form prose (FR-COACH-05); the model call SHALL request
structured (JSON-Schema-enforced) output. The **model-facing** structured-output JSON-Schema the model
call enforces SHALL be **exactly** those four §4.2 fields (`language`, `quiet`, `observations`,
`recommendations`) and **nothing else** — in particular the fallback marker (below, FR-COACH-07) is **not**
part of it, so a model can never emit (forge) a fallback card. The **server-returned** payload SHALL be
those four §4.2 fields **plus** a single reserved, **server-set** boolean **fallback marker** that is
**present on every payload** — `false` on every normal insight/chat card and `true` only on the server's
fallback card — so normal cards keep **one** fixed shape and only the marker's value distinguishes the
fallback (resolving any absent-vs-present-false ambiguity). The **fallback card** (FR-COACH-07) SHALL
itself conform to this §4.2 structure so the shape holds with **no exception**. The payload SHALL contain
**no emoji**, and no-emoji SHALL be **server-enforced** by a post-generation check (not left to the
prompt): coach output containing any emoji is non-conforming and does not reach the user (NFR-DES-01).

#### Scenario: The insight payload conforms to the §4.2 schema
- **GIVEN** a generated insight
- **WHEN** its payload is inspected
- **THEN** it has the fields `language`, `quiet`, `observations` (each `{text, metric_refs}`), and `recommendations` (each `{text, metric_refs}`) with those types, and carries no free-form prose outside that structure; the **server-returned** payload additionally carries the server-set fallback marker set to **`false`** on this normal card, while the **model-facing** structured-output schema remains **exactly** the 4 §4.2 fields (architecture §4.2, FR-COACH-05)

#### Scenario: Chat replies reuse the same schema
- **GIVEN** a chat reply
- **WHEN** its payload is inspected
- **THEN** it conforms to the **same** §4.2 structure as the insight card, and its **server-returned** payload likewise carries the server-set fallback marker set to **`false`** on this normal card (the **model-facing** structured-output schema remaining **exactly** the 4 §4.2 fields) (architecture §4.2)

#### Scenario: The fallback card also conforms to the §4.2 schema
- **GIVEN** the coach has degraded to its defined fallback card
- **WHEN** the fallback payload is inspected
- **THEN** it conforms to the **same** §4.2 structure (`language`, `quiet`, `observations`, `recommendations`) as a normal card — so "both insight and chat conform to §4.2" holds with **no** exception — and it carries **no numeric content** (architecture §4.2, FR-COACH-05/07)

#### Scenario: No emoji appears in coach output
- **GIVEN** any generated coach payload (insight or chat)
- **WHEN** its `text` fields are inspected
- **THEN** no emoji character appears in any `text` value, because no emoji may appear in coach output (NFR-DES-01)

#### Scenario: A model that emits emoji still yields emoji-free output
- **GIVEN** a stubbed model whose output contains emoji characters
- **WHEN** the coach runs its server-side post-generation no-emoji check
- **THEN** the emoji-bearing output is treated as non-conforming and does not reach the user — it degrades along the ladder to an emoji-free card — so the returned payload's `text` fields contain no emoji (NFR-DES-01)

### Requirement: Reply language follows the user's setting (FR-COACH-06)
The system SHALL produce coach output in the user's chosen language from `users.coach_language`
(`en` or `uk`, **default `en`** per A-7): the payload's `language` field SHALL equal that setting and the
`observations`/`recommendations` text SHALL be written in it. The app UI stays English-only (out of this
slice); the coach only honors the stored language, it does not set or toggle it.

#### Scenario: A Ukrainian preference yields a Ukrainian reply
- **GIVEN** an authenticated user whose `users.coach_language` is `uk`
- **WHEN** a coach insight or chat reply is generated
- **THEN** the payload's `language` is `"uk"` and its observation/recommendation text is written in Ukrainian (FR-COACH-06, A-7)

#### Scenario: The default language is English
- **GIVEN** an authenticated user whose `users.coach_language` is the default `en`
- **WHEN** coach output is generated
- **THEN** the payload's `language` is `"en"` (A-7)

### Requirement: Graceful degradation on LLM failure (FR-COACH-07)
The system SHALL **degrade gracefully** on a missing, malformed, or schema-invalid LLM response, a
transport error, an exhausted grounding retry, or an absent API key: it SHALL **not crash**, render
**no fabricated numbers**, **log** the failure (NFR-REL-01), and return a **defined fallback card**. The
**single provider ladder** (architecture §4.4 grounding + §4.5 provider, TC-LLM-01) is: **(1)** the
primary model `gemma-4-31b-it` (Google AI Studio, structured output) -> grounding-validate; **(2)** on a
**grounding violation**, one corrective retry on `gemma-4-31b-it` -> grounding-validate; **(3)** on a
**second grounding failure**, a **transport error**, or **schema-invalid JSON**, a **single** attempt on
the fallback model `Gemini 3 Flash` (**no** further corrective retry — §4.5 says "once") ->
grounding-validate; **(4)** if the fallback attempt fails or still violates, or any terminal failure
occurs (including `settings.google_ai_api_key` being `None`/empty), the coach returns the defined
fallback card (the §4.4 terminal state). The **fallback card** SHALL be a §4.2-conforming payload with
`quiet: true`, **exactly one** short **non-numeric** observation, an **empty** `recommendations` list,
**zero numeric content**, and the reserved **fallback marker** set to `true`. That marker SHALL be a single
**server-set** boolean **present on every payload** (`false` on every normal insight/chat card, `true`
only here) and **excluded from the model-facing structured-output JSON-Schema** (FR-COACH-05), so a model
can never forge a fallback card and a client can always distinguish the fallback from a normal quiet card
by the marker's value; its exact user-facing copy and HTTP status remain implementation detail. A provider error for **any** model id (including because the configured ids are unusual) SHALL be
treated as a failure and degrade along this ladder — never crash the app.

#### Scenario: A malformed / schema-invalid LLM response degrades to the fallback card (E-8)
- **GIVEN** the primary and fallback model calls both return malformed or schema-invalid JSON
- **WHEN** the coach handles the responses
- **THEN** it returns its defined fallback card — a §4.2-conforming payload carrying **no** fabricated number (not an uncaught server error) — logs the failure, and does not crash (E-8, FR-COACH-07, NFR-REL-01)

#### Scenario: The provider falls back from gemma-4-31b-it to Gemini 3 Flash before erroring
- **GIVEN** the primary model `gemma-4-31b-it` fails (a second grounding failure, a transport error, or schema-invalid JSON)
- **WHEN** the coach handles that failure
- **THEN** it makes a **single** fallback attempt on `Gemini 3 Flash` (no further corrective retry), and only if that also fails/violates returns the defined fallback card (architecture §4.5, TC-LLM-01, matching FR-COACH-02)

#### Scenario: The fallback card is a §4.2-conforming, number-free card with a server-set fallback marker
- **GIVEN** the coach has exhausted the provider ladder (or the API key is absent)
- **WHEN** it returns the fallback card
- **THEN** the card is a §4.2-conforming payload with `quiet: true`, **exactly one** short non-numeric observation, an **empty** `recommendations` list, **zero numeric content**, and the reserved **server-set** fallback marker set to `true` — that same marker being `false` on every normal card and **excluded from the model-facing JSON-Schema**, so a model can never forge a fallback card and the marker's value alone distinguishes it from a normal quiet card (FR-COACH-05/07, NFR-REL-01)

#### Scenario: A missing API key degrades to the fallback card without crashing
- **GIVEN** `settings.google_ai_api_key` is `None` or empty
- **WHEN** a coach insight or chat is requested
- **THEN** the coach returns its defined fallback card without crashing and without fabricating any number, because the key is read only via pydantic-settings and its absence is a graceful degradation (TC-STACK-02, NFR-REL-01)

#### Scenario: An unusual or rejected model id degrades gracefully, never crashes
- **GIVEN** the provider rejects a configured model id
- **WHEN** the coach handles that provider error
- **THEN** it degrades along the fallback ladder to the defined fallback card and never raises an unhandled error, so a wrong model id can never crash the app (architecture §4.5, NFR-REL-01)
