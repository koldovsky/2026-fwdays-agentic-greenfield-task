# Use NLTK punkt_tab only (drop legacy punkt) + flatten the TTS voice catalog

## Context and Problem Statement

Quick 20260711-0847 closes two leftovers from the Phase 1 + Phase 3
implementation:

1. **NLTK `punkt` is deprecated.** NLTK marked the legacy `punkt`
   package as deprecated in 3.8.2 and ships a single `punkt_tab`
   data package; the legacy `punkt` package is no longer the
   canonical install target. Phase 1 plan 05 originally baked both
   packages into the Docker image (the assumption was that
   `PunktTokenizer` needed both); in practice `PunktTokenizer`
   only reads from `tokenizers/punkt_tab/`. The current
   `bake_nltk.py` script + the `/health/nltk` response shape both
   still expose the legacy `punkt` surface (the `punkt_installed`
   boolean + the dual `punkt punkt_tab` install command), which is
   misleading for users who try to run the suggest_command.

2. **TTS voice catalog is a fixed set, not a per-language matrix.**
   The Phase 3 implementation shipped a per-language
   `VOICES_BY_LANGUAGE` dict in `domain/voices.py` mapping each of
   the 19 NLTK-supported languages to one OpenAI voice. In
   practice, OpenAI's voice catalog is a fixed set (the same
   `alloy` / `ash` / `ballad` / `coral` / `echo` / `fable` / `onyx`
   / `nova` / `sage` / `shimmer` / `verse` / `marin` / `cedar`
   voices work for every supported language). There is no
   provider endpoint to call for the catalog. The per-language
   mapping is misleading and the `domain/voices.py` module is dead
   weight.

This ADR records the decision to (a) drop `punkt` everywhere and
(b) flatten the voice catalog to a single canonical list.

## Considered Options

### NLTK data package

* **Drop `punkt` entirely; use `punkt_tab` only** (chosen)
* Keep `punkt` + `punkt_tab` as a dual install (status quo)
* Replace NLTK with spaCy `sentencizer` (already rejected by ADR 0010)

### TTS voice catalog shape

* **Flat list, single endpoint** (chosen)
* Per-language dict, `GET /voices?language=<iso>` (status quo)
* Server fetches the catalog from the upstream OpenAI instance on
  every request (overkill; OpenAI does not expose this endpoint)

## Decision Outcome

### NLTK data package

Chose "Drop `punkt` entirely; use `punkt_tab` only", because:

1. NLTK 3.9.4 marks the legacy `punkt` package as deprecated; the
   `PunktTokenizer` import path only reads from `tokenizers/punkt_tab/`.
2. The legacy `punkt` package adds ~14MB of duplicated data to the
   Docker image for no functional benefit (the locked D-09 install
   command becomes `python -m nltk.downloader punkt_tab` instead
   of `python -m nltk.downloader punkt punkt_tab`).
3. The `/health/nltk` response shape collapses from 6 fields to 4
   (no `punkt_installed` / `punkt_tab_installed` booleans; the
   missing-package state is encoded in the nullable
   `suggest_command` + `install_size_mb_estimate` fields). The
   frontend banner logic becomes:
   - target in `fallback_languages` (in the 19 but pickle missing)
     → banner with install command,
   - target NOT in `supported_languages` (NLTK does not ship a
     tokenizer for that language) → banner WITHOUT install command,
   - otherwise → no banner.

### TTS voice catalog shape

Chose "Flat list, single endpoint", because:

1. OpenAI's voice catalog is a fixed set — there is no per-language
   provider endpoint to call. The `VOICES_BY_LANGUAGE` dict was
   wishful thinking.
2. The router exposes `GET /api/v1/voices` → `{voices: [...]}` —
   the SPA renders the full list in the voice dropdown. The router
   also exports a `VOICES` constant the jobs router uses for the
   D-06 catalog check (`body.voice in VOICES`).
3. The `domain/voices.py` module + the `lib/voices.ts` SPA mirror
   are deleted. The Playwright `voices.test.ts` is deleted (the
   equivalent coverage is now `test_voices_router.py`).

## Consequences

### Good

* The Docker image is ~14MB smaller (one NLTK package instead of
  two).
* The `/health/nltk` response is unambiguous: a `null`
  `suggest_command` means "everything is installed" (no further
  action needed).
* The frontend banner is more accurate: the install command is
  only shown when it would actually help (i.e. the language IS in
  the NLTK set but the pickle is missing).
* The voice catalog is a single source of truth in the backend
  router (`VOICES`); the SPA fetches it from
  `GET /api/v1/voices` and renders the full list.

### Bad

* The D-09 response shape is a breaking change vs. the Phase 1
  contract. The frontend `HealthNltkResponse` TS mirror is updated
  in lockstep.
* Per-language voice matching is removed; this is a deliberate
  scope reduction (the previous behavior mapped 19 NLTK-supported
  languages to 1 voice each, which was never user-visible because
  every supported language had the same single voice).
* The `audioop-lts` runtime-dep decision (ADR 0014) is unaffected
  but now ships as a regular `[project] dependencies` entry in
  `pyproject.toml` (previously the `mocks` dev extra) — this
  removes the `Dockerfile` `RUN uv pip install audioop-lts` line.
