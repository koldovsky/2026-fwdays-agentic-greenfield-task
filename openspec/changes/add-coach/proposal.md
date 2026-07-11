## Why

Cadence's differentiator is a Whoop-style **AI coach**: it reads the user's computed metrics, remembers
the conversation, and gives short, *grounded* advice — never inventing a number (product brief, "AI
coach"). Slice 004 now produces the closed metrics **snapshot** (`GET /api/stats/snapshot`,
`app/schemas/stats.py` `SnapshotResponse`) and slice 005 renders it; nothing yet turns it into coaching.
This change adds the **backend AI coach and its eval suite**: a single structured LLM call over
(snapshot + stored conversation history), a fixed-shape structured card, a programmatic grounding
validator that makes "no fabricated number" a mechanical check, graceful degradation on any model
failure, and the committed eval rubric + fixture cases that grade the output.

Authored **before any code** (spec-first, per [`openspec/README.md`](../../README.md)): this is the
ratified contract the implementation is built against. The HOW is taken **verbatim from architecture §4**
(the coach/LLM contract — snapshot §4.1, output schema §4.2, memory §4.3, grounding §4.4, provider/failure
§4.5) and §2.1 (the `coach_messages` / `coach_insights` tables), never re-derived. It **reuses** slice
001's `CurrentUser` + user_id-scoped repository boundary (FR-AUTH-07) and **reuses the exact snapshot
builder** slice 004 shipped (`app/services/stats.py::StatsService.get_snapshot` ->
`app/core/snapshot.py::build_snapshot`) so what the UI shows and what the coach sees are one artifact. The
API key is read only through the config layer already wired by the owner
(`settings.google_ai_api_key`, TC-STACK-02).

## What Changes

- Generate a **weekly insight card** for the current week (user-TZ Monday 00:00 -> now) — 2-4
  observations + 1-2 recommendations in the §4.2 shape (counts enforced), or a **quiet** card when nothing
  warrants advice — served by `POST /api/coach/insight` as a **read-through cache**: a cached
  `coach_insights` row for `(user_id, current-week Monday)` is returned with **no LLM call**, else generate
  -> return, **caching (upsert, `week_start = snapshot.window.start`) only a grounded, non-fallback card** —
  a degraded fallback card is returned but **not** cached, so a transient failure self-heals on the next
  same-week request; v1 does not auto-regenerate mid-week. **FR-COACH-01**
- Enforce **grounding** via a pure `app/core/grounding.py`: build the allowed-number set
  **deterministically from the real `SnapshotResponse` leaves** (every numeric leaf `v` as raw/`round(v)`/`round(v,1)`;
  shares also as percent `round(v*100)`/`round(v*100,1)`; minute leaves — incl. `top_categories[].week_min` — also as
  `h:mm` from **both** `floor(v)` and `round(v)`; the local-time leaf as `HH:MM`; dates excluded) plus
  numbers in the user's message, extract output numbers, exempt bare integers 0-9 without units (§4.4 item
  3), and treat any other number as a violation -> one corrective retry on `gemma-4-31b-it`, then the single
  `Gemini 3 Flash` attempt, then the fallback card; the validator is the coach eval's CRITICAL criterion
  (§4.4). **FR-COACH-02**
- Answer **chat** questions via `POST /api/coach/chat`, grounded in the snapshot + stored history, and
  persist both turns to the per-user `coach_messages` thread (§2.1). **FR-COACH-03**
- **Assemble** each request from the snapshot (via the reused stats builder) + the user's stored history
  and **nothing else** — raw session rows never reach the LLM — trimming history newest-first to
  ~2,000 tokens / a hard cap of 20 turns, no summarization (§4.1, §4.3). **FR-COACH-04**
- Return a **fixed-shape structured JSON** payload (`{language, quiet, observations[], recommendations[]}`,
  JSON-Schema-enforced) for both insight and chat, rendered as cards, no emoji (§4.2, NFR-DES-01).
  **FR-COACH-05**
- Reply in the user's **language** from `users.coach_language` (`en`/`uk`, default `en`), UI English-only
  (§4.5, A-7). **FR-COACH-06**
- **Degrade gracefully** on a missing/malformed/schema-invalid response, transport error, exhausted
  grounding retry, or absent API key via the **one** unified ladder (§4.4 + §4.5, TC-LLM-01): primary
  `gemma-4-31b-it` -> grounding-validate; on a grounding violation, one corrective retry on
  `gemma-4-31b-it`; on a second grounding failure / transport error / schema-invalid JSON, a single
  `Gemini 3 Flash` attempt; then the defined fallback card — no crash, no fabricated numbers, logged. The
  **fallback card** is itself a §4.2-conforming payload (`quiet: true`, one non-numeric observation, empty
  recommendations, zero numeric content, plus a reserved **server-set** fallback marker — present on every
  payload, `false` on normal cards, and **excluded from the model-facing JSON-Schema** so a model can never
  forge a fallback card) so FR-COACH-05 holds with no exception (NFR-REL-01). **FR-COACH-07**
- Add the **coach eval suite**: a rubric (`evals/rubrics/coach-output.md`, grounding = CRITICAL + a scored
  subjective usefulness) + fixture cases (`evals/cases/coach/`, including an **E-9** fabricated-number case
  and an **E-1** empty-snapshot case, deterministic and free — no live LLM in the committed gate,
  NFR-COST-01) + the score files the `check-eval-ratchet` gate watches
  (`docs/qa/eval/{baseline,latest}.json`, committed with `latest` >= `baseline`). The committed ratchet
  tracks **only programmatic dimensions** (`grounding_pass_rate`, `grounding_violations` [lower-better],
  `format_conformance`, `language_correct`, `no_emoji`); the subjective `insight_usefulness` is graded by
  the eval-judge (LLM) as a **separate, non-gating** pass in `/run-slice`, keeping the ratchet
  deterministic and free.
- Ship one **Alembic migration** for the two new tables `coach_messages` and `coach_insights` (§2.1);
  `users.coach_language` already exists (slice 001) and is **read**, not re-added.

## Capabilities

### New Capabilities
- `coach`: the backend AI coach — a single structured LLM call over (metrics snapshot + stored
  conversation history) that produces a fixed-shape insight card and grounded chat replies, a pure
  programmatic grounding validator, graceful fallback on any model failure, and the committed output-eval
  rubric + cases. This one slice-level capability delivers the `coach` requirement group
  (FR-COACH-01..07) of [`docs/requirements.md`](../../../docs/requirements.md) as one backend slice.

### Modified Capabilities
<!-- None. `coach` is a new capability. It REUSES the slice-001 `auth` capability (CurrentUser +
     user_id-scoped repos, FR-AUTH-07) and the slice-004 `metrics` capability's snapshot builder
     (StatsService.get_snapshot / build_snapshot, the GET /api/stats/snapshot payload) without
     modifying either. It reads the existing users.coach_language column (slice 001) and appends its
     router to the entry-point-allowlisted app/main.py. -->

## Impact

- **Requirements** (authoritative text in [`docs/requirements.md`](../../../docs/requirements.md)):
  FR-COACH-01..07 (owned). **Applies** (honors, does not own): NFR-COST-01 (free-tier, no live LLM in the
  gate), NFR-REL-01 (log-and-degrade, never crash), NFR-DES-01 (no emoji in coach output), TC-LLM-01
  (single structured call, `gemma-4-31b-it` -> `Gemini 3 Flash`, no agent framework), TC-STACK-02 (key via
  pydantic-settings). **Reuses** FR-AUTH-07 (per-user isolation) and the slice-004 snapshot. Closes
  **O-5** (memory) and **O-7** (grounding) into the contract; exercises **E-1** (empty snapshot),
  **E-8** (malformed LLM), **E-9** (fabricated number — the core eval criterion).
- **Endpoints** (architecture §9/§10), both behind `CurrentUser`, user_id-scoped:
  `POST /api/coach/insight` (generate/return the current-week insight card) and `POST /api/coach/chat`
  (one grounded chat turn).
- **Consumed seam (no new stats endpoint):** the **shipped** slice-004 snapshot — the real
  `SnapshotResponse` (`app/schemas/stats.py`) obtained via `StatsService.get_snapshot(user_id=…,
  window=None)` (-> pure `build_snapshot(...)`), not the illustrative §4.1 sketch. The coach re-derives no
  number. A **seam test against the real `SnapshotResponse` shape (not a mock)** is required so
  producer/consumer drift fails a test.
- **Backend (new files):** `app/core/grounding.py` (pure allowed-number set + validator, §4.4);
  `app/services/coach.py` (request assembly §4.3, the LLM client + fallback ladder §4.5, grounding
  orchestration); `app/repos/coach.py` (user_id-scoped reads/writes over `coach_messages` /
  `coach_insights`); `app/models/coach.py` (the two ORM models) + one Alembic migration; the
  `app/api/coach.py` router with its Pydantic request/response models mirroring §4.2. The router is
  registered by appending to the entry-point-allowlisted `app/main.py` (and the models to
  `app/models/__init__.py`).
- **Config:** `settings.google_ai_api_key` is **already wired** (slice-006 owner setup:
  `app/config.py`, env `GOOGLE_AI_API_KEY`, and the placeholder in `backend/.env.example`); the coach
  reads it and degrades when it is None/empty. No new secret is committed.
- **Evals:** `evals/rubrics/coach-output.md` + `evals/cases/coach/*` + `docs/qa/eval/{baseline,latest}.json`
  (see What Changes). Deterministic, offline, free (NFR-COST-01).
- **Tests:** pure `app/core/grounding.py` unit tests (E-9, derived renderings, small-int exemption) first;
  service tests for assembly (snapshot+history-only, memory trimming, fallback ladder) with the LLM client
  stubbed; a happy-path contract test per endpoint and a per-user isolation test; the real-shape snapshot
  seam test; each acceptance test carries an `@trace <FR-ID>` docstring so `check-traceability` goes
  GAP -> COVERED.
- **Docs:** the thin anchor [`docs/specs/006-coach.md`](../../../docs/specs/006-coach.md) links to this
  change for the Python traceability harness (specs<->OpenSpec bridge,
  [`openspec/README.md`](../../README.md)).

## Out of scope

Belongs to other slices; this change must not implement it.

- **The React coach drawer / floating button** — the bottom-right button, the side drawer, the rendered
  insight card, and the chat thread UI (DESIGN §7.5, **FR-SHELL-02**) — a later shell slice. This slice
  produces the structured payloads the drawer will later render; it ships **no** frontend. FR-SHELL-02 is
  **not owned here**.
- **Setting or toggling `coach_language`** — any UI or endpoint to *choose* the coach language. This slice
  **reads** `users.coach_language` (created by slice 001); the language picker is a settings/shell concern.
- **The live-poll transport** — the 5-second `GET /api/sync/state` poll and cross-device refresh
  (architecture §5, NFR-DATA-01) — slice 007. Coach requests are per-call, on demand.
- **Metric computation** — every M1-M6 formula, window, threshold, zone, baseline, and the snapshot
  assembly (FR-METR-*, FR-STATS-*, architecture §3-§4.1) — slices 004/005. This slice **consumes** the
  shipped snapshot and computes no metric; if a value the coach needs is absent from the snapshot, that is
  flagged for the metrics slice, never re-derived here.
- **Any live LLM call in the committed gate** — the eval cases are deterministic fixtures; no network call
  runs in CI or the ratchet (NFR-COST-01). Real provider calls happen only at runtime with the owner key.
- **The browser extension and OAuth** (FR-EXT-*, FR-AUTH-04/05) — their own slices.
