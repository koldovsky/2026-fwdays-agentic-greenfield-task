# 021 - 006-coach - spec-author

## Run

- **Date:** 2026-07-11 23:13 (Europe/Kyiv)
- **Slice:** 006-coach (backend AI coach + eval suite)
- **Role:** spec-author (OpenSpec change + thin anchor; docs only, no code)
- **Branch:** claude/sleepy-spence-101307
- **Commits:** (none - the orchestrator commits at ratify)

## Objective

Author the OpenSpec change `add-coach` (capability `coach`) and the thin anchor
`docs/specs/006-coach.md` from the ratified docs alone, covering the seven owned FR-COACH ids with
observable GIVEN/WHEN/THEN scenarios, taking the HOW verbatim from architecture §4/§2.1, closing O-5/O-7,
and quoting the real shipped snapshot seam. Spec/design/tasks/anchor only.

## What was done

- **`openspec/changes/add-coach/proposal.md`** - Why / What Changes (one bullet per owned id) /
  Capabilities (new `coach`; reuses `auth` + `metrics`, modifies neither) / Impact / Out of scope.
- **`openspec/changes/add-coach/specs/coach/spec.md`** - `## ADDED Requirements`, one `### Requirement:`
  per FR-COACH-01..07 in SHALL form naming its id, 22 `#### Scenario:` total. Covers grounding
  retry-then-fallback + E-9 (FR-COACH-02), malformed-LLM fallback + provider ladder + missing key + E-8
  (FR-COACH-07), empty snapshot E-1 + quiet insight (FR-COACH-01), language en/uk (FR-COACH-06),
  snapshot+history-only assembly + 20-turn/~2000-tok trim (FR-COACH-04), fixed §4.2 shape + no-emoji
  (FR-COACH-05), grounded chat + memory (FR-COACH-03).
- **`openspec/changes/add-coach/design.md`** - context, decisions (snapshot builder reuse, §4.3 memory,
  §4.4 grounding, §4.5 provider ladder with the model ids taken verbatim + the "any model error degrades,
  never crashes" note, config-only key, two new tables), risks, and `## Open questions` closing **O-5**
  (§4.3+§4.1) and **O-7** (§4.4) each with a `Resolution:` marker.
- **`openspec/changes/add-coach/tasks.md`** - test-first implement checklist: data model + one Alembic
  migration (2 new tables; does NOT re-add `users.coach_language`), user_id-scoped repos, pure
  `app/core/grounding.py` (RED first), request assembly + memory, provider client + fallback ladder, the
  two routes + Pydantic schemas, the real-shape snapshot **seam test (not a mock)**, the eval
  rubric+cases+baseline/latest, verify, review.
- **`docs/specs/006-coach.md`** anchor (**Status: draft**) - Problem/goal, `Requirements covered` = the 7
  owned FR-COACH ids ONLY, a separate `Applied / reused (not owned)` section for NFR/TC/FR-AUTH-07,
  `Consumes (seams)` quoting the real `SnapshotResponse` + `StatsService.get_snapshot` + auth deps +
  `users.coach_language` + `settings.google_ai_api_key`, and `Out of scope` (FR-SHELL-02 drawer, the
  language picker, live-poll §5, metric compute, live LLM in the gate, extension/OAuth).

Key seam-fidelity call: the coach reads the **shipped** `SnapshotResponse` (`app/schemas/stats.py`) via
the same `StatsService.get_snapshot` builder the UI uses - NOT the stale architecture §4.1 JSON sketch
(which omits `all_time_min`, `per_category_per_day`, and category identity). Model ids `gemma-4-31b-it`
/ `Gemini 3 Flash` encoded verbatim per TC-LLM-01, with a graceful-degradation-on-any-model-error scenario
so an unusual id can never crash the app.

## Verification

```
$ npx openspec validate add-coach --strict
Change 'add-coach' is valid
EXIT=0

$ python scripts/check-specs
check-specs: 6 anchor(s), 71 known id(s).
check-specs: no violations (single-owner ids, known ids, ratified changes carry no open questions).
EXIT=0
```

Per-id coverage (each owned id -> its covering scenarios in `specs/coach/spec.md`):

- FR-COACH-01 -> notable-week 2-4/1-2 card; quiet card; empty-week graceful (E-1).
- FR-COACH-02 -> out-of-snapshot number caught (E-9); derived rendering allowed; bare 0-9 exempt; one
  corrective retry before fallback.
- FR-COACH-03 -> grounded reply + both turns stored; chat grounded like insight; per-user isolation.
- FR-COACH-04 -> snapshot+history only (no raw rows); same builder as the UI; newest-first 20-turn /
  ~2000-tok trim.
- FR-COACH-05 -> insight conforms to §4.2; chat reuses schema; no emoji.
- FR-COACH-06 -> `uk` -> `language:"uk"`; default -> `"en"`.
- FR-COACH-07 -> malformed both models -> fallback (E-8); primary -> Gemini 3 Flash ladder; missing key ->
  fallback; unusual/rejected id degrades, never crashes.

Note: first `check-specs` run FAILED (FR-AUTH-07 dual-claimed by anchors 001 + 006) because the "applied"
note was inside the `Requirements covered` section; fixed by moving it to a separate
`Applied / reused (not owned)` section, then re-ran green (output above).

## Findings

- `[MINOR]` architecture §4.1's literal JSON sketch is stale vs the shipped `SnapshotResponse`
  (`app/schemas/stats.py`). Handled by pinning the seam to the shipped shape (as `005-stats-ui.md` did);
  flagged so the owner can refresh §4.1 when next touching architecture.md. Non-blocking.

## Verdict

**DRAFT READY.** The `add-coach` contract is written; `openspec validate --strict` and `check-specs` are
both green; all seven owned FR-COACH ids are covered by observable scenarios; O-5/O-7 are closed; the
snapshot seam is quoted from the real shipped shape. Awaiting the spec-griller, the fidelity-eval, and the
orchestrator-as-judge; the orchestrator flips the anchor `draft -> ratified` and commits.

## What was NOT done / follow-ups

- **No product code, tests, migration, or eval artifacts written** (spec-author boundary). The eval
  rubric (`evals/rubrics/coach-output.md`), the fixture cases (`evals/cases/coach/*`), and the score files
  (`docs/qa/eval/{baseline,latest}.json`) are **specced as tasks (tasks §7)**, not created:
  `check-eval-ratchet` fails if a baseline exists but latest is absent, so a lone baseline must not be
  committed at draft time - both land together in the implement phase (`latest >= baseline`). Until then
  the ratchet is a clean no-op.
- **Did not run** `scripts/verify.*`, `check-eval-ratchet`, or `check-traceability` - the last still shows
  FR-COACH-* as GAP (no `@trace` tests exist yet; they land in the implement phase). Only the two required
  self-checks were run.
- The fallback-card exact HTTP status/copy is left to the implementation - the docs pin the *behavior*
  (no crash, no fabricated numbers, logged, a defined state), so scenarios assert those observables rather
  than inventing a status code.

---

## Rework — iteration 2 (griller findings, 2026-07-11)

Independent griller returned 6 BLOCKING + 6 MINOR holes in the **behavioral contract** (seams verified
clean, untouched); fidelity-eval PASSED (94). Every finding closed **from the docs** (`requirements.md`
FR-COACH-01..07, `architecture.md` §2.1 + §4.1-§4.5, and the shipped `SnapshotResponse` in
`app/schemas/stats.py`); nothing invented. No `BLOCKED` — the docs settled every finding.

### BLOCKING closed

- **B1 — one unified retry/fallback ladder.** Reconciled §4.4 (grounding limb) + §4.5 (authoritative
  provider ladder) into ONE ladder encoded identically in FR-COACH-02 and FR-COACH-07 and design: primary
  `gemma-4-31b-it` -> grounding-validate; on a grounding violation, one corrective retry on
  `gemma-4-31b-it`; on a **second grounding failure / transport error / schema-invalid JSON**, a single
  `Gemini 3 Flash` attempt (no further corrective retry — §4.5 "once"); then the fallback card. Design
  states §4.4's "fallback card" is the terminal state after §4.5's ladder is exhausted. Removed the old
  FR-COACH-02 wording that jumped straight from the retry to the fallback card (contradicted §4.5).
- **B2 — `POST /api/coach/insight` cache semantics.** Pinned read-through against `coach_insights`
  (§2.1 `UNIQUE(user_id, week_start)`, NFR-COST-01): cache hit -> return with **no LLM call**; miss ->
  generate -> upsert -> return; v1 does not auto-regenerate mid-week (refresh is FR-SHELL-02, out of
  scope). New scenario: a same-week second POST returns the cached card, no LLM call.
- **B3 — enforce FR-COACH-01 counts.** The §4.2 structured-output contract constrains observations 2-4 /
  recommendations 1-2 (quiet = exactly 1 obs / 0 rec); out-of-range counts are **schema-invalid -> the B1
  ladder**, never shown as-is. New scenario added.
- **B4 — fallback/error card shape pinned.** §4.2-conforming payload: `quiet: true`, exactly one
  **non-numeric** observation, empty `recommendations`, **zero numeric content**, plus an explicit fallback
  marker (boolean/reserved field). FR-COACH-05 and FR-COACH-07 scenarios now assert it conforms to §4.2 and
  carries no numbers (making "renders no fabricated number" observable). Copy/status stay implementation
  detail.
- **B5 — grounding allowed-number set made deterministically derivable.** Enumerated against the **real
  `SnapshotResponse` leaves**: every numeric leaf as raw/rounded-int/one-decimal; share-typed
  (`focus.deep_share`, `baselines.focus_share.value`) also percent; minute-typed (`*_min`, `deep_minutes`,
  `daily_avg_30d_min`, every `per_day[].min`) also `h:mm`; `consistency.median_start_local` as its `HH:MM`
  literal; date components (`window.start/end`, `per_day[].date`) excluded from numeric extraction; plus
  chat-message numbers. New determinism scenario. Encoded in FR-COACH-02 + design + tasks 2.2.
- **B6 — token-budget limb scenario (§4.3).** Added: <=20 turns whose combined size exceeds ~2,000 tokens
  (`len(chars)/4`) drops oldest turns newest-first until it fits ("~" kept approximate).

### MINOR folded in

- **M1** — bare-digit exemption scenario now uses a real digit token ("your 8 deep blocks" -> extractor
  emits `8`, exemption clears it); design notes spelled-out numbers ("eight") are out of §4.4's digit-form
  extraction by design, not a hole.
- **M2** — `coach_insights.week_start = snapshot.window.start` (the builder's user-TZ Monday) pinned.
- **M3** — chat turns persisted **both-or-neither**: on success persist user+coach; on degraded/fallback
  persist neither (no dangling user turn, no fabricated coach turn). Scenario + design line.
- **M4** — chat input validation: empty/whitespace `user_message` -> **422**; defensive max length
  (≈2,000 chars ≈ ~500 tok, reject-not-clip, same spirit as slice-004's `_MAX_SESSION_*`). Scenario +
  task 6.4.
- **M5** — no-emoji **server-enforced** by a post-generation check (emoji output is non-conforming -> the
  ladder -> emoji-free card). Scenario with a stubbed emoji-emitting model -> emoji-free output.
- **M6** — split eval dimensions: committed ratchet `docs/qa/eval/{baseline,latest}.json` tracks ONLY
  programmatic dims (`grounding_pass_rate`, `grounding_violations` [lower-better], `format_conformance`,
  `language_correct` [checks the `language` field], `no_emoji`); subjective `insight_usefulness` graded by
  the eval-judge (LLM) as a separate, non-gating `/run-slice` pass. Design + tasks 7.1/7.3/7.4 updated.
- **Fidelity nit** — bare-0-9 citation fixed from "decision 6" to "§4.4 item 3" in spec.md + design.md.

### Rework verification

```
$ npx openspec validate add-coach --strict
Change 'add-coach' is valid
EXIT=0

$ python scripts/check-specs
check-specs: 6 anchor(s), 71 known id(s).
check-specs: no violations (single-owner ids, known ids, ratified changes carry no open questions).
EXIT=0
```

Contract counts after rework: 7 `### Requirement:` (one per owned FR-COACH id), **31** `#### Scenario:`
(up from 22, all additive — no existing scenario weakened): FR-COACH-01=5, -02=5, -03=5, -04=4, -05=5,
-06=2, -07=5. New scenarios present and grep-confirmed: B2 cached, B3 out-of-range counts, B5 determinism,
B6 token budget, M1 bare-digit, M3 degraded-persists-neither, M4 empty-message-422, M5 emoji-free,
B4 fallback-conforms. Model ids stay verbatim (`gemma-4-31b-it` ×20, `Gemini 3 Flash` ×15; no variants).
`Requirements covered` unchanged (7 owned FR-COACH ids only); seams unchanged.

### What was NOT done (rework)

- **Still spec/design/tasks/anchor only** — no product code, tests, migration, or eval artifacts
  (`evals/rubrics/coach-output.md`, `evals/cases/coach/*`, `docs/qa/eval/*.json` remain **tasks**, not
  created; a lone baseline would trip `check-eval-ratchet`, so both land together in the implement phase).
- **Anchor `docs/specs/006-coach.md` untouched** (seams were verified clean; findings were behavioral).
- Did not run `verify.*` / `check-traceability` (FR-COACH-* still GAP until `@trace` tests land in
  implement). Only the two required self-checks were run. **Did not commit** (orchestrator commits at
  ratify).

---

## Rework — iteration 3 (final tightening: 1 residual BLOCKING + 6 MINOR, 2026-07-11)

Re-grill confirmed 11/12 prior findings closed; fidelity-eval **PASSED (95)** with **no drift**. Closed
the 1 residual BLOCKING (B5) + 6 MINOR, **all from the docs** (`architecture.md` §3.2 + §4.1-§4.5 and the
shipped `SnapshotResponse` in `app/schemas/stats.py`); nothing invented, no scenario weakened, no
`BLOCKED`. Scope: `spec.md` / `design.md` / `tasks.md` / `proposal.md` only — the anchor
`docs/specs/006-coach.md` and the seams were left untouched.

### BLOCKING closed

- **B5 residual — derived-form rounding made deterministic AND non-false-positive.** Pinned the allowed
  set to **fixed granularities** so two validators can no longer disagree on a non-clean float leaf: for
  each numeric leaf `v` the set always holds `raw v` / `round(v)` / `round(v, 1)`; **share-typed**
  (`focus.deep_share`, `baselines.focus_share.value`) additionally the percent renderings `round(v*100)`
  **and** `round(v*100, 1)`; **minute-typed** additionally the `h:mm` from **both** `floor(v)` **and**
  `round(v)` minutes; the local-time leaf as its `HH:MM` literal. Stated the governing rule — **where a
  rounding choice exists the set includes BOTH the floored and rounded rendering** (deterministic, never a
  false-positive on a legitimate rendering — a faithful tightening of §4.4's named granularities). Encoded
  in FR-COACH-02 + design + tasks 2.2 + the proposal summary. New scenario: a non-clean share ≈ `0.4295`
  cited as "43%" is **grounded, not a violation** (`round(42.95)=43`; arithmetic pre-verified).

### MINOR folded in (each doc-grounded)

- **MINOR-1 — fallback marker pinned.** Now a **reserved, server-set boolean**, **present on every
  payload** (`false` on normal cards / `true` only on the fallback card), and **excluded from the
  model-facing structured-output JSON-Schema** (§4.2's four fields), so a model can never forge a fallback
  card and the absent-vs-present-false looseness is resolved. FR-COACH-05 now separates the **model-facing**
  schema (the 4 fields) from the **server-returned** schema (4 + marker); FR-COACH-07 text + its
  fallback-card scenario + design (output + B4 decisions) + tasks 4.5/5.3 + proposal updated.
- **MINOR-2 — over-long message → 422.** Pinned symmetric with the empty case (no LLM call, reject-not-
  clip). FR-COACH-03 text + new dedicated scenario + design + tasks 6.4.
- **MINOR-3 — persistence on a fallback-*model* success.** Clarified a **success = any grounded,
  non-fallback reply from EITHER model** (primary `gemma-4-31b-it`, incl. after the corrective retry, or
  the `Gemini 3 Flash` fallback model) → persist both turns; only the **terminal fallback card** persists
  neither. FR-COACH-03 text + the both-turns scenario reworded + a new **corrective-retry-success**
  scenario + design + tasks 5.2.
- **MINOR-4 — null-leaf scenario.** Added: `< 3` active days ⇒ `consistency.score`/`regularity`/
  `start_stability`/`median_start_local` all `null` with `low_confidence: true` (architecture §3.2, common
  first-week state) — the coach cites no null leaf as `0`/any number and does not crash (exercises the
  existing "when non-null" guards). New FR-COACH-02 scenario + design + tasks 2.1.
- **MINOR-5 — `week_min` classified minute-typed.** `top_categories[].week_min` stated explicitly as a
  weekly-minutes quantity (its `h:mm` rendering allowed), not left to the `*_min` glob alone. FR-COACH-02 +
  design + tasks 2.2.
- **MINOR-6 — regression guard.** The corrective-retry (grounding), cache-hit, and token-budget scenarios
  are all still present and unmodified.

### Rework verification (real output)

```
$ npx openspec validate add-coach --strict
Change 'add-coach' is valid
EXIT=0

$ python scripts/check-specs
check-specs: 6 anchor(s), 71 known id(s).
check-specs: no violations (single-owner ids, known ids, ratified changes carry no open questions).
EXIT=0
```

Contract counts after rework: **7** `### Requirement:` (one per owned FR-COACH id, unchanged), **35**
`#### Scenario:` (up from 31, +4 additive — no scenario weakened): FR-COACH-01=5, **-02=7** (+fractional-
share-grounded, +null-leaf), **-03=7** (+corrective-retry-success, +over-long-422), -04=4, -05=5, -06=2,
-07=5. New scenario titles grep-confirmed at spec.md lines 105/115/151/175 + the tightened server-set
fallback-marker scenario at 299. Model ids stay verbatim (`gemma-4-31b-it` ×12, `Gemini 3 Flash` ×9; the
model-id sanity grep returns **only** those two — no variants). `Requirements covered` unchanged (7 owned
FR-COACH ids only); anchor + seams untouched.

### What was NOT done (rework)

- **Still spec/design/tasks/proposal only** — no product code, tests, migration, or eval artifacts; the
  anchor `docs/specs/006-coach.md` and the seam block were deliberately **not** touched (task scope).
- Did not run `verify.*` / `check-traceability` (FR-COACH-* stay GAP until `@trace` tests land in the
  implement phase). Only the two required self-checks were run. **Did not commit** (orchestrator commits at
  ratify).

---

## Rework — iteration 3 final (closing pass: 1 BLOCKING + 2 MINOR, 2026-07-11)

Contract at **fidelity 96**, all prior findings closed; a final re-grill surfaced exactly **1 BLOCKING +
2 MINOR**, each with a prescribed, **doc-symmetric** fix. Applied exactly those — no redesign, no scenario
weakened, `Requirements covered` unchanged (7 owned FR-COACH ids), model ids verbatim. All three closed
**from the docs** (`architecture.md` §4.1/§4.2/§4.4 + FR-COACH-01/03/05 + the shipped `SnapshotResponse` in
`app/schemas/stats.py`); nothing invented, no `BLOCKED`.

### BLOCKING closed

- **Insight degradation-to-fallback caching carve-out.** The read-through cache said a miss
  generates + **upserts**, but was silent on a generation that runs the FR-COACH-07 ladder to the
  **fallback card** — an implementer could upsert that fallback into `coach_insights`, and since v1 does
  not auto-regenerate mid-week the `UNIQUE(user_id, week_start)` row would serve "coach unavailable" for the
  whole week ("stuck all week"). Closed **by symmetry with FR-COACH-03's both-or-neither rule** and
  FR-COACH-01's intent ("generates an insight card for the current week"): **a fallback insight is returned
  but NOT upserted; only a grounded, non-fallback card — including a quiet card — is cached**, so a
  transient failure **self-heals** on the next same-week request. Encoded in FR-COACH-01 requirement text +
  `design.md`'s cache decision; new scenario *"A degraded insight is returned but not cached, and self-heals
  on the next same-week request"* (spec.md:53). Kept `tasks.md` 5.1 + `proposal.md`'s FR-COACH-01 bullet in
  sync (they previously said "upsert on miss" unconditionally) — a consistency edit, not a redesign.

### MINOR folded in (each doc-grounded)

- **MINOR-1 — `baselines.*` value/delta leaves classified by unit (deterministic false-positive fix).**
  The typed-lists omitted baseline sub-metric leaves, so "baseline 1:14/day" or "focus share up 5%" would
  wrongly flag. Faithful to §4.4's generic "percent form of shares, h:mm renderings of minute values" and
  the shipped `BaselinesRead`/`BaselineEntryRead`: `baselines.volume.{value,delta}` → **minute-typed**
  (h:mm; value 74 → "1:14", matches §4.1's `daily_avg_30d_min`=74); `baselines.focus_share.{value,delta}` →
  **share-typed** (percent; added `.delta`, e.g. 0.05 → "5%"); `baselines.consistency.{value,delta}` (a
  0-100 score) and `baselines.switch_load.{value,delta}` (a switch-load figure) → **plain numeric**
  (raw/round/one-decimal only — no percent/h:mm). Stated explicitly in FR-COACH-02 + `design.md` so **no
  baseline leaf is left to a glob**. No scenario added (the existing derived-rendering + determinism
  scenarios already cover it; the enumerated "every numeric leaf" already grounded these via the catch-all,
  so this is a clarification, not a widening of behavior).
- **MINOR-2 — server-set marker restated on the normal-card conformance scenarios.** FR-COACH-05's
  *"insight conforms to §4.2"* + *"chat reuses the schema"* and FR-COACH-01's *"quiet card"* scenarios listed
  only the 4 model-facing §4.2 fields; a test-engineer writing an exact-key shape assertion could assert a
  4-key shape and clash with the 5-field server payload. Added a clause to each of those three normal-card
  scenarios: the **server-returned** payload additionally carries the fallback marker set to **`false`**
  (the **model-facing** structured-output schema stays exactly the 4 §4.2 fields). The fallback-card
  scenario (already correct) was **not** changed.

### Rework verification (real output)

```
$ npx openspec validate add-coach --strict
Change 'add-coach' is valid
EXIT=0

$ python scripts/check-specs
check-specs: 6 anchor(s), 71 known id(s).
check-specs: no violations (single-owner ids, known ids, ratified changes carry no open questions).
EXIT=0
```

Contract counts after this pass: **7** `### Requirement:` (unchanged), **36** `#### Scenario:` (up from 35,
**+1** — only the new insight-fallback-not-cached scenario; per-id: **FR-COACH-01=6**, -02=7, -03=7, -04=4,
-05=5, -06=2, -07=5). Model ids stay verbatim — the model-id grep returns **only** `gemma-4-31b-it` (×12)
and `Gemini 3 Flash` (×9), **no variants**. `Requirements covered` (anchor) unchanged = the 7 owned
FR-COACH ids; anchor + seams **untouched**.

### What was NOT done (this pass)

- **Spec/design/tasks/proposal only** — no product code, tests, migration, or eval artifacts; the anchor
  `docs/specs/006-coach.md` and the seam block were **not** touched (task scope).
- Did not run `verify.*` / `check-traceability` (FR-COACH-* stay GAP until `@trace` tests land in the
  implement phase). Only the two required self-checks were run. **Did not commit** (orchestrator commits at
  ratify).
