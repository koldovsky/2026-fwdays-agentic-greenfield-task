# Testing

Source: research STACK/PITFALLS + `.planning/config.json`. Read for any test or scenario work.

## Stack

- `pytest` (9.1.1) + `pytest-asyncio` (1.4.0) + `pytest-bdd` (8.1.0).
- **pytest-bdd is mandatory** — the six `.feature` files in `docs/features/` use the Gherkin `Rule:` keyword, parsed via `gherkin-official`.
- The whole test suite runs **in-process** against the single FastAPI app via `httpx.ASGITransport` — no real HTTP port, no separate server.

## Tag semantics (execution scope)

Every scenario carries exactly one test-layer tag and one execution-scope tag:

| Tag | Layer | Where it runs |
|---|---|---|
| `@web` | SPA / browser | Playwright/static-export smoke |
| `@api` | REST + WS contract | pytest-bdd against FastAPI |
| `@integration` | end-to-end slice | pytest-bdd with fixtures |

| Tag | Scope | When |
|---|---|---|
| `@smoke` | live demo path | judges run this; ≤78-scenario full load |
| `@regression` | CI gate | full CI run, not live demo |
| `@wip` / `@future` | deferred | skipped by sprint runner |
| `@defer-combined` | combined-workflow scenarios | re-tagged from `@integration @smoke` on combined scenarios in `voice-over-generation.feature` and `export-and-download.feature`; live demo skips, CI may opt-in |

**Live demo runs `@smoke` only.** Full 78-scenario `@web @api @integration` suite runs in CI, not the demo path. Do not add `@smoke` to combined scenarios.

## Mock provider harness in tests

- Tests assert failure modes (`provider_timeout`, `provider_rate_limited`, mid-chunk resume) — a happy-path-only mock silently fails ~12 BDD scenarios.
- Use the `force_timeout` hook on `MockTranslationAdapter` / `MockTTSAdapter` to drive timeout/wait scenarios deterministically.
- Mock audio is WAV silent bytes (deterministic) so pydub's ±50ms stitch assertion is reproducible.
- Mock translation adapters need (at least) two profiles: identity passthrough and `DropsNthTag` — so F3's "exactly at the 95% threshold" scenario is testable.

## Known test pitfalls (from research)

- **html5lib parser normalization** inflates tag counts vs raw source — count tags from the parsed tree, not the raw string, for the F3 ≥95% diff.
- **4096-char chunk with no sentence boundary** — guard the chunker to never emit a chunk larger than 4096 even when a sentence exceeds it (fall back to hard split, not skip).
- **`<2s first-byte` streaming** — use `aiofiles`-backed `StreamingResponse`, not `FileResponse` (which buffers the whole file before the first byte).
- **Filename path-traversal** — three adversarial BDD titles in F6 (`export-and-download.feature`) exercise separator/control-char stripping and `..` basename safety; the safe-filename helper must canonicalize to a basename, never trust raw interpolation.
- **ebooklib spine/NCX chapter enumeration** — lock the canonical chapter rule in F1; if discovered at F6, regenerating demo artifacts is high-cost.

## Running

```bash
# from backend/
uv run pytest                      # full suite
uv run pytest -m smoke             # live demo slice
uv run pytest docs/features/translation-configuration.feature   # one feature
```
