# 023 - 006-coach - implementer

## Run

- **Date:** 2026-07-12 07:15 (Europe/Kyiv)
- **Slice:** 006-coach
- **Role:** implementer (maker)
- **Branch:** claude/sleepy-spence-101307
- **Commits:** `d2f2e56` (slice: `backend: add AI coach (grounding, ladder, cache) + eval suite`, `Slice: 006-coach`) and `e1739d7` (infra: `backend: wire the coach API key via config (owner setup)`, `Refs: TC-STACK-02`), plus this record-correction follow-up.

## Objective

Implement the backend AI coach (spec `docs/specs/006-coach.md`, OpenSpec `add-coach`) — the
pure grounding validator, the one provider/degradation ladder, the weekly-insight read-through
cache, grounded chat with per-user memory, and the deterministic eval suite — turning the
`test-engineer`'s RED tests GREEN and holding the whole `gate-slice` battery, **without
weakening any test**.

## What was done

- **Grounding validator (FR-COACH-02):** `backend/app/core/grounding.py` — pure, framework-free
  `check_grounding(snapshot, text, *, user_message=None) -> GroundingResult`. Builds the
  allowed-number set deterministically from the real `SnapshotResponse` leaves by unit type
  (catch-all raw/round/one-decimal; share→percent; minute→`h:mm` from floor and round;
  `median_start_local`→`HH:MM`; dates excluded; + user-message numbers; bare 0-9 exempt).
- **Data model + migration (§2.1):** `backend/app/models/coach.py` (`CoachMessage`,
  `CoachInsight`), appended to `backend/app/models/__init__.py`; one migration
  `backend/alembic/versions/0004_coach.py` (index `(user_id, created_at)`, `UNIQUE(user_id,
  week_start)`, `role` CHECK, cascade FKs). Did **not** re-add `users.coach_language`.
- **Repo (FR-AUTH-07):** `backend/app/repos/coach.py` — every method takes `user_id`
  (append turn, read thread newest-first, get/upsert insight).
- **Service + provider seam (FR-COACH-01/03/04/05/06/07):** `backend/app/services/coach.py` —
  `trim_history` (pure §4.3), `get_coach_provider` (injectable async seam; real thin `httpx`
  Google-AI transport marked `# pragma: no cover`), the one ladder
  (`gemma-4-31b-it` → 1 corrective retry on grounding → single `Gemini 3 Flash` → fallback
  card), parse/validate/counts/emoji/grounding, read-through cache, both-or-neither chat
  persistence, language override.
- **Router + schemas:** `backend/app/api/coach.py` (`POST /api/coach/insight` + `/chat`, both
  `CurrentUser` + `require_csrf`), registered by appending to `backend/app/main.py`;
  `backend/app/schemas/coach.py` (`CoachCard` with the server-set `fallback` marker; `ChatRequest`
  422 on empty/whitespace/over-long before any call).
- **Eval suite (§7):** `evals/rubrics/coach-output.md`; cases in `evals/cases/coach/` (E-9
  fabricated-number negative control, E-1 empty-snapshot, two grounded reference cards);
  `docs/qa/eval/{baseline,latest}.json` (programmatic dims only, verified through the real
  validator).
- **Added maker tests** (not touching the acceptance bar): `tests/test_coach_service_units.py`,
  `tests/test_coach_grounding_units.py` — cover parse/validate branches, emoji, provider wiring,
  and validator robustness edges.
- Committed the owner-provided `backend/.env.example` + `backend/app/config.py` (key wiring,
  TC-STACK-02) as a **separate infra commit** (`Refs: TC-STACK-02`, no `Slice:` trailer) rather
  than under the slice: `check-trajectory` flags `backend/app/config.py` (slice-001-owned, not in
  the entry-point allowlist) as a cross-slice overlap if it lands under `Slice: 006-coach`. As
  infra traced to a constraint no spec owns, it classifies as cross-cutting setup, not a slice
  code path (the documented BC-*/infra-commit pattern). `backend/.env` stays git-ignored.

## Verification

```
$ python scripts/gate-slice
==> [3/4] Backend: lint + types + migrations + tests (with DB)  → All checks passed! / Success: no issues found in 65 source files
==> [4/4] Frontend: install + typecheck + build + unit tests     → Test Files 10 passed (10) / Tests 32 passed (32)
193 passed in 96.31s
==> gate-slice: backend coverage = 97.42%
gate-slice: coverage ratchet OK (97.42% >= floor 82%).
gate-slice: GREEN - stack verified and coverage ratchet held.
EXIT=0
```

```
$ RUN_DB_TESTS=1 pytest tests/test_coach_api.py -q          → 24 passed
$ pytest tests/test_coach_grounding.py tests/test_coach_assembly.py \
         tests/test_coach_service_units.py tests/test_coach_grounding_units.py -q → pure, all passed
$ alembic upgrade head                                       → 0003 -> 0004_coach, EXIT=0
$ alembic check                                              → No new upgrade operations detected. EXIT=0
$ python scripts/check-traceability                          → 45 claimed, 45 traced, 0 gap; FR-COACH-01..07 COVERED
$ python scripts/check-specs                                 → no violations
$ python scripts/check-eval-ratchet                          → 5 dimension(s) hold at or above the baseline
```

Coach-module coverage: `app/core/grounding.py` 100%, `app/services/coach.py` 99.4% (only the
network transport `# pragma: no cover`), `app/api|models|schemas/coach.py` 100%, `app/repos/coach.py`
95.8%.

## Findings

- `[MINOR] app/repos/coach.py:62` — the `upsert_insight` UPDATE branch (an existing cached row)
  is a defensive safety path not reached in v1's flow (the cache short-circuits before a second
  same-week generation, and a fallback is never cached), so it stays uncovered by 1 line. Left
  as-is rather than adding a contrived test; overall coverage is 97.42%.

## Verdict

DONE against the spec's acceptance checks and `scripts/gate-slice` (GREEN). No acceptance test
was weakened, skipped, or narrowed. Independent code-review / security-review and the Judge gate
remain (owned by other roles).

## What was NOT done / follow-ups

- No live LLM call is exercised (NFR-COST-01): the real `_google_ai_provider` transport is
  `# pragma: no cover` and untested; only the injected seam is tested. Runtime behavior against
  Google AI Studio is unverified here.
- No frontend: the coach drawer is FR-SHELL-02 (a later slice), out of scope.
- `docs/current-state.md` left untouched (the Judge marks the slice done / archives `add-coach`).

## Rework (2026-07-12, grounding-contract deviations)

An independent review found three deviations from the FR-COACH-02 grounding contract (the
slice's CRITICAL "no fabricated number" criterion) plus one security-hygiene note. All four are
closed here; each grounding fix is **red-first** and **no existing test was weakened** (the E-9
fabrication tests, `test_coach_grounding.py`, and `test_coach_api.py` all stay green).

- **Fix 1 (false NEGATIVE, a fabrication passthrough) - uk comma decimals.** The numeric-token
  extractor knew only period decimals, so a `uk` reply citing a fabricated one-decimal in
  `[0,10)` with a comma (e.g. `"3,5 hours"`) split into two exempt bare digits `3`/`5` and the
  fabricated 3.5 was reported **grounded** - a hole in the anti-fabrication promise for the
  shipped `uk` coach (FR-COACH-06). `backend/app/core/grounding.py`: `_TOKEN_RE` now accepts a
  comma fraction (`[.,]`), and a new `_num_value` normalizes `3,5` -> `3.5` at every float
  conversion. A fabricated `3,5` is now a **violation**; a real leaf rendered with a comma
  (`74,6` for `daily_avg_30d_min` 74.6) stays **grounded**.
- **Fix 2 (false POSITIVE, spec deviation) - share cited as a bare/worded percent.** `share()`
  added the percent only to the `%`-form set, so `deep_share ~= 0.4295` cited as bare `"43"` or
  `"43 percent"` was flagged, though spec.md enumerates `0.4295` grounds `{43, 43.0}`. `share()`
  now also adds `round(v*100)` / `round(v*100, 1)` to the plain-number set (the `%`-form path
  is unchanged).
- **Fix 3 (false POSITIVE, spec deviation on named leaves) - `>=100h` h:mm.** The `h:mm`
  extractor capped hours at two digits, so `all_time_min = 9000` rendered `"150:00"` split into
  `"150"`/`"00"` and `150` was flagged. The hours group is now `\d+`; `all_time_min = 9000`
  grounds `"150:00"` and a fabricated `"151:00"` is still a violation. (The allowed-set builder
  already emitted full-width `h:mm`, so no builder change was needed.)
- **Fix 4 (security hygiene, 1 line) - external-transport error log.**
  `backend/app/services/coach.py`: the provider transport-error log drops `exc_info=True` and
  now logs `type(exc).__name__` only, so a future URL-based auth change cannot echo the API key
  via a traceback (the key is still sent as the `x-goog-api-key` header; auth unchanged).
  Defense-in-depth (NFR-REL-01). Rate-limiting (the other security MINOR) is out of scope - no
  ratified requirement, a documented owner follow-up.

Red-first tests were added to `backend/tests/test_coach_grounding_units.py` (the acceptance bar
untouched). Confirmed **RED** against the old validator (fabricated `3,5` -> grounded=True,
`violations=[]`; bare `43` -> `violations=['43']`; `150:00` -> `violations=['150','00']`), then
**GREEN** after the fix.

### Rework verification

```
$ RUN_DB_TESTS=1 pytest tests/test_coach_*.py -q     -> 55 passed
$ python scripts/gate-slice                          -> GREEN; coverage 97.91% >= floor 82%; EXIT=0
$ python scripts/check-traceability                  -> 45 claimed, 45 traced, 0 gap
$ python scripts/check-trajectory                    -> no git-visible process violations
$ python scripts/check-specs                         -> no violations
$ python scripts/check-eval-ratchet                  -> 5 dimension(s) hold at/above baseline
$ ruff check <changed> && mypy app                   -> All checks passed / no issues (65 files)
```

All four committed coach eval cases re-verified through the updated validator: **E-9 still
catches its planted `180`** (grounded=False, violations=['180']); E-1, G-INSIGHT, and G-CHAT-UK
stay grounded (no new false positive from the widened extractor).
