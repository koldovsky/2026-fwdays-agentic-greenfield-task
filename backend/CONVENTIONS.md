# Backend conventions

Source: ADRs 0001/0003/0005 + research (versions verified 2026-07-03). Read for any backend code.

## Toolchain

- **Package manager: `uv`** (ADR-0001, locked — do not re-litigate). Never use pip/poetry/hatch.
- Python ≥ 3.11. Dependency resolution and venv are unified in `uv`.
- Lockfile discipline: `uv sync` reproduces environments; do not hand-edit the lockfile.

## Framework stack (versions verified current 2026-07-03)

| Concern | Library | Version | Notes |
|---|---|---|---|
| API framework | FastAPI | 0.139.0 | async REST + WS, Pydantic validation |
| ASGI server | Uvicorn | 0.49.0 | **`--workers 1` mandatory** (see below) |
| Validation/ORM | Pydantic 2.13.4 + SQLModel 0.0.39 | — | `job_type` discriminator is one field across schema + ORM |
| DB | SQLAlchemy 2.0.51 + aiosqlite 0.22.1 | — | WAL, single-writer |
| Migrations | Alembic | 1.18.5 | |
| HTTP client | httpx | 0.28.1 | async; provider adapters |
| EPUB | EbookLib 0.20 + BeautifulSoup4 4.15.0 + html5lib 1.1 | — | html5lib parser (NOT lxml) — fixes F3 tag-counting consistency |
| Sentence detection | NLTK 3.9.4 (Punkt) **or** spaCy `sentencizer` | — | Decide in the translation phase; NLTK `punkt`/`punkt_tab` lazy-download is a known pitfall — bundle the data |
| Audio stitch | pydub 0.25.1 | — | Requires system **`ffmpeg`** binary (not a pip package) |
| Multipart uploads | python-multipart 0.0.32 | — | **Hard runtime requirement** for FastAPI `UploadFile` (F1 50MB upload) |
| Tests | pytest 9.1.1 + pytest-asyncio 1.4.0 + pytest-bdd 8.1.0 | — | pytest-bdd mandatory (parses `Rule:` Gherkin) |

## Mandatory gotchas

- **`uvicorn ... --workers 1`** — multi-worker forks the in-process `JobOrchestrator` queue and breaks F5's 3-active-jobs semantics. Never raise worker count this sprint.
- **`python-multipart`** must be in `backend/pyproject.toml` (not just dev deps) — without it, `UploadFile` 422s on every upload.
- **System `ffmpeg`** must be present in the container image; pydub cannot decode/encode without it. For the mock TTS, default to **WAV** output to avoid MP3 encoder-delay padding that breaks F4's ±50ms stitch assertion.
- **NLTK `punkt` lazy download** — pre-bundle the data in the image, or use spaCy `sentencizer` (no download). A network call at test time breaks hermeticity.
- Do NOT use: Celery/Redis, `lxml` as the BS4 parser, sync `requests`, Socket.IO client, `--workers >1`, full-artifact memory buffering, free-threaded CPython 3.13t.

## Mock provider harness

- Define `TranslationProviderPort` and `TTSPort` as `typing.Protocol`s.
- `MockTranslationAdapter` and `MockTTSAdapter` are the **production** adapters bound at the FastAPI DI composition root this sprint.
- Mocks must preserve structural HTML tags hermetically so F3-AC1's ≥95% diff assertion is reproducible, and return deterministic silent-audio bytes so pydub's ±50ms stitch is reproducible.
- Expose a `force_timeout` hook on the mocks so F3-AC3 / F4-AC7 timeout scenarios can assert `provider_timeout` without real network latency.
- The swap path to real Ollama/OpenAI/OmniVoice/OpenAI-TTS adapters is PRD Phase 4 — **workflow services do not change** (that's the hexagonal point). Do not couple services to adapter internals.

## Async discipline

FastAPI's event loop is shared with the worker `asyncio.Task`. Blocking library calls (some EPUB/audio processing) must offload to thread pools (`run_in_executor`) to avoid stalling the loop and the WebSocket progress channel.

## Error envelope

All error responses use `{error: {code: string, message: string, details?: object}}`. See [API contract](../docs/agents/api-contract.md) for the code→HTTP map.
