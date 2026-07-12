# 023 - 006-coach - implementer

## Run

- **Date:** 2026-07-12 07:15 (Europe/Kyiv)
- **Slice:** 006-coach
- **Role:** implementer (maker)
- **Branch:** claude/sleepy-spence-101307
- **Commits:** the slice commit on this branch (subject `backend: add AI coach (grounding, ladder, cache) + eval suite`)

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
- `git add`-ed the owner-provided `backend/.env.example` + `backend/app/config.py` (key wiring,
  TC-STACK-02); `backend/.env` stays git-ignored.

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
