# API contract

Source: PRD § + the `.feature` files (observable contract). Read for any endpoint, error path, or threshold change.

## Base

- All endpoints under `/api/v1/...`.
- Error envelope: `{error: {code: string, message: string, details?: object}}` — every error response uses this shape.

## Error codes → HTTP

| `error.code` | HTTP | When |
|---|---|---|
| `file_too_large` | 413 | EPUB > 50MB at upload |
| `invalid_epub` | 422 | Not a valid EPUB / parse error / corrupted bytes |
| `source_language_required` | 422 | Translation job submitted without source language |
| `provider_rate_limited` | 429 | Upstream translation/TTS provider returned 429 (mocked harness can inject) |
| `provider_timeout` | 504 | Provider call exceeded 60s retry budget |
| `artifact_not_applicable` | 404 | Translation artifact requested for a voiceover-only job (and vice versa) |
| `job_not_completed` | 409 | Download requested before the job reached the terminal state |
| `job_not_cancellable` | 409 | `DELETE /api/v1/jobs/{id}` on a job in {`completed`, `failed`, `cancelled`} (terminal state) |
| `artifact_expired` | 410 | Artifact past its TTL on scratch disk |

> Note: `job_not_completed` / `artifact_expired` (HTTP 410) appear in F6 scenarios but are not codified in the PRD's error table — treat the `.feature` files as the source of truth for those.

## Endpoints (sprint shape)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/epubs` | Upload + validate EPUB (≤50MB), return metadata (`title`, `author`, `declared_languages[]`, `chapter_count`) |
| `GET` | `/api/v1/epubs/{id}` | Re-fetch metadata (D-06 SPA prefill for source-language; returns `{epub_id, title, author, declared_languages[], chapter_count, chapter_ids[]}`) |
| `POST` | `/api/v1/jobs` | Create job; body carries `job_type` + workflow-specific config; dispatches on `job_type`. Discriminated union: `voiceover` / `translation+voiceover` → 501 `phase_not_yet_implemented` (D-05); `translation` with no `source_language` + EPUB declares 0 languages → 422 `source_language_required` (D-06) |
| `GET` | `/api/v1/jobs` | List jobs (sprint: simple list; queue state observable) |
| `GET` | `/api/v1/jobs/{id}` | Job status + `last_chunk_id` + progress |
| `DELETE` | `/api/v1/jobs/{id}` | Cancel a queued/running job (Quick 260710-oih / JOBS-06); marks the row `cancelled` then physically deletes the `jobs` row + its `job_chunks` + its `audio_files` in one transaction. **204** on success (no body); **404** `not_found` for an unknown id; **409** `job_not_cancellable` when the job is in a terminal state (`completed` / `failed` / `cancelled`). The running task is left to finish its current chunk; the row is gone before any next chunk write. |
| `WS` | `/api/v1/jobs/{id}/events` | Streaming events within **<1s** of chunk completion (D-03 — BDD wins; the prior path was a stale reference). 1008 close on unknown id; 6-field envelope `{job_id, job_type, chunk_id, progress_current, progress_total, status}` |
| `GET` | `/api/v1/jobs/{id}/artifact` | Download artifact (translated EPUB for `translation`; per-chapter audio ZIP for `voiceover`; both for `translation+voiceover`); streaming first-byte **<2s** for ≤500MB |
| `GET` | `/api/v1/health/nltk` | NLTK `punkt_tab` install state + supported/fallback language lists (D-09 — 4-key locked shape: `supported_languages[], fallback_languages[], suggest_command?, install_size_mb_estimate?`; `suggest_command` + `install_size_mb_estimate` are `null` when `punkt_tab` is already baked) |
| `GET` | `/api/v1/providers/ollama/models` | Canned Ollama model list (mock — agent-discretion; Phase 3 wires the real adapter) |
| `GET` | `/api/v1/providers/v1/models` | Dynamic model loading for the SPA's "Load Models" button (Phase 1 plan 02). `?provider=ollama\|openai-compatible` + `X-Provider-Key: <string>` header (required for OpenAI-compatible, ignored for Ollama). 401 `invalid_provider_key` when the OpenAI-compatible key is missing. |
| `POST` | `/api/v1/providers/openai-compatible/validate` | Legacy mock validation endpoint (preserved for back-compat; the SPA uses the new `/providers/v1/models` GET from Plan 02) |
| `GET` | `/health` | Bare liveness probe (Phase 1; no `/api/v1` prefix) |

### Consolidated OpenAI-compatible mock service (Phase 1 plan 04)

The standalone `mock-openai-service` (`MOCK_OPENAI_URL` default `http://127.0.0.1:8765`, single port) replaces the two separate `mock-translator` + `mock-tts` services. The in-process `MockTranslationAdapter` + `MockTTSAdapter` remain the sprint default; custom mode (`provider_mode="custom"`) spawns the consolidated subprocess + binds `HttpTranslationAdapter` + `HttpTTSAdapter` to its base URL.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/chat/completions` | OpenAI-compatible translation (request: `{model, messages: [{role, content}], temperature?}`; response: `{id, object: "chat.completion", created, model, choices: [{index, message: {role, content}, finish_reason}], usage: {prompt_tokens, completion_tokens, total_tokens}}`). The `content` carries the D-07 `<span xml:lang="...">` wrapper + `id={chunk_id}` marker. |
| `POST` | `/v1/audio/speech` | OpenAI-compatible TTS (request: `{model, input, voice, response_format?}`; response: 200 + `Content-Type: audio/wav` + raw audio bytes starting with the RIFF magic). `response_format=mp3` returns the same WAV bytes (the mock simplification; the wire shape mirrors OpenAI). |
| `GET` | `/v1/models` | OpenAI-compatible model catalog (response: `{object: "list", data: [{id, object: "model", created: 0, owned_by}, ...]}`). Returns the union of the Ollama + OpenAI canned lists. |
| `GET` | `/v1/audio/voices` | Voice catalog (`{voices: [<voice_id>, ...]}` — flat list, no per-language matrix). The list comes from `epubtv.api.routers.voices.VOICES` (Quick 20260711-0847 / ADR 0015 retired the per-language `VOICES_BY_LANGUAGE` mapping). |
| `GET` | `/healthz` | Liveness probe — `{"status": "ok"}` for compose healthcheck + CI smoke. |

The D-08 contract seam is maintained: `HttpTranslationAdapter.translate(...)` returns the assistant `content` field (the wire shape is the adapter's concern; the workflow service consumes the `TranslationPort` protocol, NOT the wire shape).

Resume endpoint (`POST /api/v1/jobs/{id}/resume`) is **deferred** to PRD Phase 4.

## Thresholds (observable in `.feature` files)

| Threshold | Value | Enforced by |
|---|---|---|
| EPUB max size | 50 MB | F1 (`file_too_large` 413) |
| Artifact max size | 500 MB | F6 streaming first-byte <2s |
| WebSocket progress latency | < 1s after chunk completes | F5 |
| Download first-byte latency | < 2s | F6 |
| Audio stitch gap | ±50 ms | F4 (mock returns WAV to avoid MP3 encoder delay) |
| TTS chunk size | ≤ 4096 chars at sentence boundaries | F4 |
| Structural HTML tag preservation | ≥ 95% of `p,h1-h6,ul,ol,li,em,strong,a` | F3 (mock preserves tags hermetically) |
| Translation target languages | ≥ 55 | F2 |
| TTS voices | ≥ 600 | F4 |
| Active jobs | 3 + queue | F5 (single-runner acceptable for demo; full queue PRD Phase 4) |
| Artifact TTL on scratch disk | 24 h | F6 (`artifact_expired` 410) |
| Provider call timeout | 60 s → retry | F3 (`provider_timeout`) |

## Performance KPIs (PRD, **relaxed this sprint**)

The PRD specifies wall-clock KPIs (Translation <6 min, Voice-Over <9 min, Combined <13 min for a 10-chapter EPUB). **These are NOT in-scope for the hackathon sprint** (see [sprint-scope.md](sprint-scope.md)) — correctness and the BDD contract take priority over speed for the demo.
