## Context

`coach` is the sixth capability, after auth (001), categories (002), timer + sessions (003), the metrics
engine (004), and the Stats UI (005). It is authored before any code against
[`docs/requirements.md`](../../../docs/requirements.md) (FR-COACH-01..07) and, for the HOW, against
**architecture §4** — the coach/LLM contract that resolves O-5 and O-7 — and **§2.1** (the
`coach_messages` / `coach_insights` tables). Where architecture already fixed a value (the model ids, the
token budget, the grounding rules, the output shape, the provider/failure ladder), this design
**references** it; there are no genuine gaps left open (see Open questions — both are closed).

The product promise is a coach whose every claim traces to a number on the screen (product brief: "Every
claim traces to a number visible on the same screen"). Mechanically, that promise is the **snapshot as the
closed set of citable numbers** + a **programmatic grounding validator**. This slice is the **backend
coach + its eval suite**: the single structured LLM call over (snapshot + history), the fixed-shape card,
the validator, graceful degradation, and the committed eval rubric + fixtures. It renders nothing — the
coach drawer (DESIGN §7.5, FR-SHELL-02) is a later shell slice. This mirrors the 004-metrics (backend) ->
005-stats-ui (frontend) split: produce the contract now, render it later.

## Goals / Non-Goals

**Goals:**
- The weekly **insight card** (2-4 observations + 1-2 recommendations, or a quiet card) for the current
  week, cached in `coach_insights` (FR-COACH-01).
- **Grounded chat** answers over the snapshot + stored history, persisted to `coach_messages`
  (FR-COACH-03).
- **Request assembly** from snapshot + history only — raw session rows never sent — reusing the exact
  slice-004 snapshot builder and trimming history per §4.3 (FR-COACH-04).
- A pure, unit-testable **grounding validator** (`app/core/grounding.py`) that is both the runtime check
  and the eval's CRITICAL criterion (FR-COACH-02, §4.4).
- **Fixed-shape structured output** (§4.2) for both modes, no emoji (FR-COACH-05, NFR-DES-01).
- **Language** honoring `users.coach_language` (FR-COACH-06, A-7).
- **Graceful degradation** on any model failure via the §4.5 ladder (FR-COACH-07, NFR-REL-01).
- The **eval suite**: rubric + deterministic fixture cases + committed baseline/latest score files.
- Reuse — never re-implement — the slice-001 `CurrentUser` + user_id-scoped repo pattern (FR-AUTH-07) and
  the slice-004 snapshot builder.

**Non-Goals:**
- The React coach drawer / floating button, the rendered insight card, and the chat thread UI (DESIGN
  §7.5, FR-SHELL-02) — a later shell slice.
- Any UI or endpoint to *choose* the coach language (this slice only **reads** `users.coach_language`).
- Live-sync transport (`GET /api/sync/state`, §5) — slice 007.
- Any metric computation or snapshot re-derivation (slices 004/005 own it).
- Any live LLM/network call in the committed gate (the eval cases are offline fixtures, NFR-COST-01).

## Decisions

- **The snapshot is the closed set of citable numbers, obtained from the shipped slice-004 builder.** The
  coach reads the **real** `SnapshotResponse` (`app/schemas/stats.py`) via
  `StatsService.get_snapshot(user_id=…, window=None)` -> pure `build_snapshot(...)` — the same artifact
  `GET /api/stats/snapshot` returns — **not** the illustrative architecture §4.1 JSON sketch (which is
  slightly stale: it omits `all_time_min`, `per_category_per_day`, and category identity, and predates
  the shipped `consistency`/`switching` fields). Reusing the one builder is what keeps "what the UI shows
  and what the coach sees are one artifact" (§4.1) literally true, and it is why the coach re-derives no
  number. A **seam test against the real `SnapshotResponse` shape (not a mock)** guards drift.
- **Request assembly = snapshot + history, and nothing else (FR-COACH-04, §4.1/§4.3).** No raw
  `sessions`/`pause_segments` row is ever serialized into the prompt. History is assembled newest-first up
  to the §4.3 budget: system (~400 tok) + snapshot (~600 tok) + most recent turns up to **~2,000 tokens**
  (approximated as `len(chars)/4`), **hard cap 20 turns**; older turns are dropped with **no**
  summarization in v1. These are architecture §4.3's exact numbers (O-5 resolution), not re-derived.
- **Output is the fixed §4.2 structure, JSON-Schema-enforced, with the counts enforced too (FR-COACH-05,
  FR-COACH-01).** `{"language": "en"|"uk", "quiet": bool, "observations": [{"text", "metric_refs": [str]}],
  "recommendations": [{"text", "metric_refs": [str]}]}`. The structured-output contract **enforces the
  counts** (§4.2 "JSON Schema enforced"): `quiet: false` -> **2-4** observations + **1-2** recommendations;
  `quiet: true` -> **exactly one** observation + **no** recommendation. A model response whose counts fall
  outside this (given its `quiet` flag) is **schema-invalid** and enters the ladder above — never shown
  as-is. **Two schemas, cleanly separated:** the **model-facing** JSON-Schema the LLM call enforces is
  **exactly** these four §4.2 fields (`language`, `quiet`, `observations`, `recommendations`) and nothing
  else; the **server-returned** payload is those four fields **plus** a single reserved, **server-set**
  boolean **fallback marker** present on every payload (`false` on normal cards, `true` only on the
  fallback card — see the fallback-card bullet). Keeping the marker out of the model-facing schema means a
  model can never emit (forge) a fallback card. Chat reuses the same schema; the fallback card conforms too
  (previous bullet). The Pydantic response models mirror this shape field-for-field.
- **No-emoji is server-enforced, not prompt-only (NFR-DES-01, M5).** A **post-generation** check runs on
  the coach text: emoji-bearing output is **non-conforming** and does not reach the user — it degrades
  along the same ladder to an emoji-free card (worst case the defined emoji-free fallback card). This makes
  "no emoji in coach output" an observable guarantee independent of what the model emits, rather than a
  prompt-only hope.
- **Grounding is programmatic post-validation in a pure module, derived deterministically from the real
  snapshot leaves (FR-COACH-02, §4.4, O-7 resolution).** `app/core/grounding.py` is framework-free (like
  `app/core/snapshot.py`), so it is unit-testable and **reused verbatim by the eval suite**. The
  allowed-number set is enumerated against the **shipped** `SnapshotResponse` leaves so two implementers
  derive the identical set (§4.4):
  - **every numeric leaf** — `window.days`; `volume.today_min/week_min/month_min/all_time_min/daily_avg_30d_min`
    and each `volume.per_day[].min`; `consistency.score/regularity/start_stability` (non-null);
    `focus.deep_count/deep_minutes/deep_share`; each `switching.per_day[].switches/interruptions/switch_load`
    and `switching.baseline_mean`; `streaks.current/longest`; each `baselines.*.value` and `baselines.*.delta`
    (non-null); each `top_categories[].id/week_min`; each `per_category_per_day[].id` and
    `per_category_per_day[].per_day[].min` — at **fixed granularities**: for each leaf value `v`, the
    **raw `v`**, **`round(v)`**, and **`round(v, 1)`** (the §4.4 catch-all);
  - **share-typed** leaves (`focus.deep_share`, and **both** `baselines.focus_share.value` and
    `baselines.focus_share.delta`) additionally in **percent** form at both granularities —
    **`round(v*100)`** and **`round(v*100, 1)`** (so a non-clean `0.4295` grounds `{43, 43.0}` -> "43%",
    and a `focus_share` delta of `0.05` grounds `5` -> "up 5%");
  - **minute-typed** leaves (every `*_min`, `focus.deep_minutes`, `volume.daily_avg_30d_min`, every
    `per_day[].min`, `top_categories[].week_min` — a weekly-minutes quantity — **and both**
    `baselines.volume.value` and `baselines.volume.delta` — a daily-average-minutes quantity) additionally
    in **`h:mm`** form computed from **both** `floor(v)` **and** `round(v)` minutes (so a fractional `74.6`
    grounds both `1:14` and `1:15`; a clean `262` -> `4:22`; a `baselines.volume.value` of `74` -> "1:14");
  - the remaining **plain-numeric** `baselines.*` leaves — `baselines.consistency.{value,delta}` (a 0-100
    score) and `baselines.switch_load.{value,delta}` (a switch-load figure) — get **only** the catch-all
    raw/`round(v)`/`round(v, 1)` renderings, **no** percent or `h:mm` (a score and a load are neither a
    share nor minutes), so every `baselines.*` leaf is classified by its unit and none is left to a glob;
  - the **local-time** leaf `consistency.median_start_local` (non-null) as its **`HH:MM`** literal;
  - **date components** (`window.start`, `window.end`, every `per_day[].date`) are **dates, not numeric
    tokens** — excluded from numeric extraction on both the snapshot and the output side;
  - **plus** numbers in the user's current chat message (chat path).

  The derived forms are computed at these **fixed granularities**, and **where a rounding choice exists the
  set includes BOTH the floored and the rounded rendering** — so the allowed set is fully deterministic
  (two implementers derive the identical set) yet never rejects a legitimate rendering of an ordinary-week
  number (the intent is to catch fabrications, not to pick one rounding — so `deep_share = 0.4295`
  legitimately cited as "43%" is grounded, not a false-positive violation). A **null** (low-confidence)
  leaf contributes nothing: per architecture **§3.2** a user with `< 3` active days has
  `consistency.score`/`regularity`/`start_stability`/`median_start_local` all `null` (the common
  first-week state), and the "when non-null" guards skip them, so the coach never cites a null leaf as `0`
  or any number.

  The validator then (2) extracts numeric tokens (integers, decimals, percents, `h:mm`) from the output,
  (3) **exempts bare integers 0-9 without units** (architecture **§4.4 item 3** — e.g. "your 8 deep
  blocks"; a **spelled-out** number like "eight" yields no digit token and is out of §4.4's digit-form
  extraction *by design*, not a hole), and (4) treats any remaining number missing from the allowed set as
  a violation. On a violation the coach runs the **one** unified ladder below (a corrective retry on the
  primary, then the `Gemini 3 Flash` attempt, then the fallback card); the violation is logged
  (NFR-REL-01). This makes FR-COACH-02 a mechanical check, not a hope.
- **ONE provider + degradation ladder, encoded identically everywhere (FR-COACH-02/07, §4.4 + §4.5,
  TC-LLM-01).** Architecture **§4.5 is the authoritative provider ladder** and **§4.4** is its grounding
  limb; they are the same ladder, reconciled so FR-COACH-02 and FR-COACH-07 describe it identically:
  1. primary `gemma-4-31b-it` (Google AI Studio, structured output) -> grounding-validate;
  2. on a **grounding violation**, **one** corrective retry on `gemma-4-31b-it` (§4.4) -> grounding-validate;
  3. on a **second grounding failure** **or** a **transport error** **or** **schema-invalid JSON**, a
     **single** attempt on the fallback model `Gemini 3 Flash` (§4.5, **no** further corrective retry —
     §4.5 says "once") -> grounding-validate;
  4. if the fallback attempt fails/violates, or any terminal failure occurs (incl. a missing key), the
     defined fallback card.

  §4.5's "retry once" is exactly the §4.4 corrective retry (grounding-specific — a system reminder can
  only correct a *grounding* violation, not a transport/schema error); a transport error or schema-invalid
  JSON therefore skips step 2 and goes straight to the single `Gemini 3 Flash` attempt. **§4.4's "fallback
  card" is the terminal state reached after the §4.5 ladder is exhausted** (step 4), not a separate path.
  **The model ids are encoded exactly as TC-LLM-01 states them even though `gemma-4-31b-it` and
  `Gemini 3 Flash` look unusual — the docs are the ceiling; a "corrected" id is not invented.** A provider
  error for **any** model id (including an unknown one) is caught and degrades to the fallback card, so a
  wrong id can never crash the app (NFR-REL-01).
- **The fallback card is a §4.2-conforming, number-free payload with a fallback marker (FR-COACH-05/07,
  B4).** So that FR-COACH-05 ("both insight and chat conform to §4.2") holds with **no** exception, the
  fallback card is itself a §4.2 payload: `quiet: true`, **exactly one** short **non-numeric** observation,
  an **empty** `recommendations` list, **zero numeric content**, plus the reserved **fallback marker** set
  to `true`. That marker is one **server-set** boolean **present on every payload** (`false` on every
  normal card, `true` only here) and is **excluded from the model-facing JSON-Schema** (previous bullet),
  so a model can never forge a fallback card and a client always distinguishes the fallback by the marker's
  value — resolving the earlier absent-vs-present-false looseness. This pins the *shape* (making "renders
  no fabricated number" observable);
  the exact user-facing copy and HTTP status stay implementation detail (the docs pin the behavior — no
  crash, no fabricated numbers, logged, a defined state — not a status code).
- **API key via config only (TC-STACK-02).** The coach reads `settings.google_ai_api_key` (already added
  by the owner setup: `app/config.py`, env `GOOGLE_AI_API_KEY`, placeholder in `backend/.env.example`);
  when it is `None`/empty the coach returns the fallback card without crashing (NFR-REL-01). The key is
  never hardcoded, logged, or printed. This slice adds **no** new config field (the field already exists).
- **Language honors `users.coach_language` (FR-COACH-06, A-7).** The request language is the user's stored
  `coach_language` (`en`/`uk`, default `en`); the payload's `language` field equals it and the content is
  written in it. Choosing/toggling the language is out of scope.
- **`POST /api/coach/insight` is a read-through cache (FR-COACH-01, §2.1, NFR-COST-01, B2/M2).** The
  endpoint returns the cached `coach_insights` row for `(user_id, current-week Monday)` **if present, with
  no LLM call**; on a miss it generates -> returns, **upserting only a grounded, non-fallback card
  (including a quiet card)**. If generation runs the FR-COACH-07 ladder to the **fallback card**, that
  card is **returned but NOT upserted** — the same both-or-neither default chat uses (FR-COACH-03):
  because v1 does not auto-regenerate mid-week, caching a "coach unavailable" fallback under
  `UNIQUE(user_id, week_start)` would serve it for the **whole week** even after the model recovers, so a
  transient failure instead **self-heals** and the next same-week request re-attempts generation rather
  than serving a cached fallback. The stored `week_start` is the snapshot's `window.start` — the same
  builder's user-TZ Monday (§4.1/§2.1) — so the cache key matches the window the card was built for.
  **v1 does not auto-regenerate mid-week**; an explicit refresh is out of scope (a later shell slice,
  FR-SHELL-02). This is the cheapest read that honors the free-tier budget (NFR-COST-01): a same-week
  second request costs zero LLM calls.
- **Chat turns are persisted both-or-neither (FR-COACH-03/07, §4.3, M3).** A **success** is **any grounded,
  non-fallback reply from either model** — the primary `gemma-4-31b-it` (including after the one corrective
  retry) or the `Gemini 3 Flash` fallback model — and on a success the `user` + `coach` turn pair is
  written to `coach_messages`. Only when the reply degrades to the **terminal fallback card** (the provider
  ladder exhausted) is **neither** turn persisted — no dangling user turn, no fabricated coach turn —
  keeping the one rolling thread clean and consistent with FR-COACH-07 ("no fabricated content") and §4.3's
  rolling-thread model. (A grounded reply from the fallback *model* is genuine conversation and persists; a
  *fallback card* is the degraded terminal state and does not.)
- **Chat input is validated defensively (FR-COACH-03, M4).** `user_message` is rejected with **422** when
  empty or whitespace-only, and an **over-long** message (above a **defensive maximum length** ≈ 2,000
  characters, i.e. ~500 tokens by §4.3's `len(chars)/4`) is rejected with **422** as well — **symmetric**
  with the empty case, **rejected, not clipped**, no LLM call. Rationale: the message is concatenated
  into the prompt (so an unbounded message could blow the §4.3 ~2,000-token history budget) **and** its
  numbers widen the grounding allowed-number set (so an adversarial message could dilute grounding); the
  2,000-char bound sits comfortably above any real single question. This mirrors slice-004's
  `_MAX_SESSION_*` defensive caps in `app/services/stats.py` (a bound above legitimate use, reject-not-clip).
- **Data model = two new tables + a migration (§2.1).** `coach_messages` (`user_id` FK, `role` TEXT
  `user|coach`, `content` TEXT NOT NULL, `language` TEXT NOT NULL, `created_at`, INDEX `(user_id,
  created_at)`) is the one rolling thread per user; `coach_insights` (`user_id` FK, `week_start` DATE NOT
  NULL — user-TZ Monday, `payload` JSONB NOT NULL — the §4.2 card, `UNIQUE(user_id, week_start)`) caches
  the current-week insight. `users.coach_language` **already exists** (slice 001, migration
  `0001_auth_email`) and is read, not re-added. One Alembic migration ships both new tables with
  hand-reviewed SQL (TC-STACK-01).
- **Isolation by reuse (FR-AUTH-07).** Both routes take `CurrentUser`; every coach repository method takes
  `user_id` and scopes its query by it (no method without a `user_id`), like `app/repos/*`. The mutating
  POSTs also carry the standard CSRF double-submit guard (`app/api/deps.py::require_csrf`), reused, not
  redefined.
- **Eval suite is deterministic and offline; the committed ratchet is programmatic-only (NFR-COST-01,
  M6).** `evals/rubrics/coach-output.md` mirrors `evals/rubrics/trajectory-quality.md`'s shape and still
  covers **both** halves: a **CRITICAL grounding gate** (any fabricated number -> `pass=false`,
  `score<=49`) plus a **scored** subjective `insight_usefulness`. `evals/cases/coach/*` are fixture triples
  `{snapshot, history?, user_message?, coach_output}` — including an **E-9** case whose `coach_output`
  plants a number absent from its `snapshot` (the validator MUST catch it) and an **E-1** empty-snapshot
  case — with **no live LLM call** in the committed gate.
  - **The committed ratchet `docs/qa/eval/{baseline,latest}.json` tracks ONLY programmatic dimensions**
    (deterministic + free, so the CI ratchet never flakes or costs a call): `grounding_pass_rate` (=1.0),
    `grounding_violations` (=0, a `lower_is_better` dimension), `format_conformance` (=1.0),
    `language_correct` (=1.0 — checks the payload's `language` **field**), and `no_emoji` (=1.0). Committed
    with `latest >= baseline` so `check-eval-ratchet` (a no-op until this baseline lands) turns green.
  - **The subjective `insight_usefulness` is graded by the eval-judge (LLM) as a SEPARATE, non-gating pass**
    in `/run-slice`, **not** in the committed ratchet — keeping the ratchet deterministic and free while
    still scoring usefulness via the rubric. The rubric covers both dimensions; only the programmatic
    scores feed the ratchet file.

## Risks / Trade-offs

- **The snapshot seam is reconciled to the SHIPPED slice-004 shape, not the §4.1 sketch.** Building the
  coach against the stale §4.1 example would drift (missing `all_time_min`, `per_category_per_day`,
  identity fields; different `consistency`/`switching` shapes). Mitigation: reuse
  `StatsService.get_snapshot` / `build_snapshot` directly and add a real-shape `SnapshotResponse` seam
  test. The grounding allowed-number set is derived from whatever the builder returns, so it tracks the
  real shape automatically.
- **The model ids look wrong but are authoritative.** `gemma-4-31b-it` and `Gemini 3 Flash` are unusual,
  but TC-LLM-01 / architecture §4.5 fix them; inventing a "corrected" id would be exactly the drift the
  fidelity-eval rejects. Mitigation: the failure path treats *any* provider/model error as a graceful
  fallback, so even if an id is wrong at runtime the app degrades rather than crashes (NFR-REL-01) — the
  behavior is safe regardless of the literal id.
- **Grounding false positives/negatives.** The allowed-number set must include enough derived renderings
  (percent of a share, `h:mm` of minutes, rounded/one-decimal) that legitimate output is not flagged,
  while still catching a fabricated number. Mitigation: the set and the extractor are pinned to §4.4 and
  driven by explicit unit fixtures (a real derived rendering passes; an out-of-snapshot number fails; a
  bare 0-9 is exempt). The same fixtures are the eval's CRITICAL criterion.
- **Free-tier reliability (NFR-COST-01).** The Gemma free tier is rate-limited; the §4.5 single-retry +
  single-fallback ladder (no regenerate-until-clean loop) bounds calls, and the committed gate never calls
  the network. Accepted.
- **Depends on slices 001 and 004.** The coach reads `users.coach_language` (001) and the snapshot builder
  (004); it lands after both. It adds its own migration for the two coach tables only.

## Open questions

Both questions this contract touches were raised in `docs/requirements.md` and **resolved by architecture
§4** at ratification; they are closed into the contract above (a ratified change carries no open
question).

1. **O-5 — coach memory structure, history trimming, the "current week" boundary, and the snapshot
   schema.**
   **Resolution:** closed by architecture **§4.3** and **§4.1**. Memory is one rolling `coach_messages`
   thread per user; each request is assembled newest-first as system (~400 tok) + snapshot (~600 tok) +
   most recent turns up to **~2,000 tokens** (approx `len(chars)/4`), **hard cap 20 turns**, older turns
   dropped, **no summarization** in v1 (§4.3). "Current week" is **user-TZ Monday 00:00 -> now** (§4.1),
   and `coach_insights.week_start` is that user-TZ Monday (§2.1). The snapshot schema is the **shipped**
   slice-004 `SnapshotResponse` (`app/schemas/stats.py`) obtained via `StatsService.get_snapshot` /
   `build_snapshot`, not the illustrative §4.1 sketch. Encoded in FR-COACH-01/03/04 above.

2. **O-7 — grounding enforcement: programmatic post-validation vs prompt-only.**
   **Resolution:** closed by architecture **§4.4** in favor of **programmatic post-validation** in the
   pure `app/core/grounding.py` (allowed-number set from the snapshot + derived renderings + the user's
   message numbers; extract output numbers; exempt bare integers 0-9 without units; any other number =
   violation -> one corrective retry -> fallback card + logged). The same validator is the eval suite's
   CRITICAL criterion. Encoded in FR-COACH-02 above.
