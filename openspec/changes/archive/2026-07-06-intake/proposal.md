## Why

`intake` is Slice S2 of the signed Phase 3 plan (`docs/mvp-capability-plan.md`
§S2, G3 2026-07-04): the conversation layer that turns a Telegram message
into a code-validated, ranked-slot-ready booking request. It depends on S1
`slots` (archived `openspec/changes/archive/2026-07-04-slots/`) for
`proposeSlots`/`holdWithRecovery`, and every later slice (`dashboard`,
`booking-hitl`, `kb-learning`) needs real conversations and real `requests`
rows to render or decide against — an empty dashboard proves nothing, so
`intake` goes second. The baseline spec `openspec/specs/intake/spec.md`
already passed G2; this change implements it, unchanged, against real code,
a real Telegram bot, and a real SQLite file.

## What Changes

- New framework-free `lib/src/intake/` modules (TC-PURE-01): a pure
  conversation-state reducer (`greeting → qualifying → profiling →
  collecting → proposing → awaiting_admin → done`, terminal `soft_decline`,
  ADR-0001 §6) with field-ownership gates per state; `validateAge`
  (`AGE_BELOW_MIN`, FR-GUARD-04, BC-AGE-01) and `validateFormat`
  (`SCOPE_VIOLATION`/`FORMAT_UNSURE`, FR-INTAKE-02, BC-SCOPE-01/02,
  BC-FORMAT-01) as deterministic gates that must pass before the state
  advances, independent of what the model claims; a pure `addressesParent`
  helper (BC-AGE-02); deterministic Ukrainian guardrail copy (age refusal,
  scope explanation, format-unsure explanation — never model-composed).
- A thin, visible tool-use loop in `packages/agent` (TC-STACK-02,
  `claude-sonnet-5`, local user-token auth only, NFR-SEC-01) whose tool set
  is closed and code-vetted: per-field save tools with enum-constrained
  schemas, `propose_slots`/`request_hold` wrapping S1's `proposeSlots`/
  `holdWithRecovery`, `amend_field`, `cancel_request`, `explain_scope`,
  `explain_format`. No `confirm`/KB-write tool exists (FR-GUARD-01/06
  structurally hold already, proven by a static test). Deterministic
  tool-result logging independent of the model's narration (ADR-0001 §5
  analog).
- `packages/bot` wiring (grammY, long polling): immediate `sendChatAction`
  on every inbound update before any agent call (NFR-UX-01), inline-keyboard
  slot/goal tickets per DESIGN.md, Ukrainian-only replies (BC-LANG-01), and
  deterministic apology-and-retry text on Telegram/Anthropic failure with
  conversation state preserved (NFR-REL-01).
- `packages/db` schema additions (TC-DATA-01): `leads` (Telegram identity
  only), `requests` (the intake profile — `state`, `student_name`,
  `student_age`, `format`, `goal_tag`/`goal_text`, `tastes`, `dream_song`,
  `experience`, `comfort`, `preferred_weekdays`, `preferred_time_range` —
  never overwritten across a lead's requests, FR-INTAKE-08), and the
  `bookings.request_id` column deferred by S1 (`ALTER TABLE ... ADD COLUMN
  IF NOT EXISTS`).
- FAQ-shaped questions (pricing, duration) get a deterministic fallback
  reply and are **not** logged anywhere in this slice — the `questions`
  table and `answer_faq`/`log_question` tools are owned entirely by S5
  `kb-learning`, not stubbed here (see `design.md` Decision 2).

No requirement text in `openspec/specs/intake/spec.md` changes as a result
of this slice; this change implements the already-accepted baseline
unchanged (same `MODIFIED`-delta convention S1 used, see `design.md`
Context and the delta file's own note).

## Capabilities

### New Capabilities

(none — `intake` is an existing G2-passed baseline capability)

### Modified Capabilities

- `intake`: no requirement *text* changes. The change carries a `MODIFIED`
  delta (`specs/intake/spec.md`) with the full, unedited baseline content so
  the archive step maps cleanly onto the existing requirement names in
  `openspec/specs/intake/spec.md`, matching the precedent set by the
  archived `slots` change.

## Impact

- **Packages touched:** `lib/` (new `lib/src/intake/` module tree),
  `packages/agent` (tool-use loop, tool definitions, Anthropic model port),
  `packages/bot` (grammY wiring, Telegram transport port), `packages/db`
  (new `leads`/`requests` tables + `bookings.request_id` column).
  `apps/dashboard` is untouched (S3 depends on this slice, not vice versa).
- **Test layers added:** Vitest unit tests in `lib/src/intake/*.test.ts`
  (TC-TEST-01), agent tool-loop tests against a fake model port, bot
  integration tests against a real SQLite file with fake Telegram/Anthropic
  transports, and one tiny real-Anthropic smoke test gated on local auth
  being present.
- **Non-goals for this slice:** no dashboard rendering (S3), no
  `confirmed`/`declined` transitions or admin decision handling
  (`booking-hitl`, S4), no FAQ answering or the `questions` table
  (`kb-learning`, S5), no group matching (Future `FR-GROUP-01`).
- **Deferred by the S2 review gate (with named owners; see
  `review-findings.json`):**
  - `propose_slots`/`request_hold` are defined in the closed tool set and
    log as pass-through no-ops, but their real wiring to S1's
    `proposeSlots`/`holdWithRecovery` (so a conversation actually reaches
    `awaiting_admin` and holds a tentative event) is owned by **S4
    `booking-hitl`** — that slice owns the hold→`pending`→confirm round
    trip and adds the `CalendarPort` to `LoopPorts`. Until then the
    conversation collects the full profile and preferences but stops short
    of a live proposal.
  - **Inline-keyboard button rendering** (slot chips, format/goal
    "tickets") is owned by **S4/dashboard**. The callback-PARSING path is
    implemented and enum-hardened here, but production does not yet render
    any buttons, so a stale-callback-to-sibling-request edge (contested
    finding) is latent until rendering lands and the keyboard payload
    carries its originating request id.
  - **Per-lead rate limiting** on the Telegram surface is a **global
    hardening** concern, not intake correctness — deferred to the
    hardening pass.
