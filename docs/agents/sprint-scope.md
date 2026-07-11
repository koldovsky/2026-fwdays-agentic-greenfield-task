# Sprint scope

Source: `.planning/PROJECT.md` + user decisions captured during `/gsd-new-project`. Read before adding scope or picking between PRD and sprint behavior.

## In scope (this sprint)

- **F1** EPUB upload & validation (≤50MB, 2.0/3.0; metadata: title, author, declared_languages, chapter_count).
- **F2** Translation configuration (provider/model/source/target language; fields hidden when Voice-Over-only chosen).
- **F3** HTML-aware translation pipeline (sentence-bounded chunks; ≥95% structural tag preservation; per-chunk progress; timeout/retry → `provider_timeout`).
- **F4** Voice-Over-only **redefined** — consumes EPUB text directly; NO translation required; audio in the EPUB's resolved primary declared language; TTS chunks ≤4096 chars; per-chapter stitch ±50ms.
- **F5 (minimal)** job state with `job_type` discriminator; WebSocket progress <1s; resumable from `last_chunk_id` (persistence only — resume endpoint deferred).
- **F6** export & download (translated EPUB for translation jobs; per-chapter audio ZIP for voiceover jobs; combined artifact shape scaffolded; safe filename; streaming first-byte <2s for ≤500MB; TTL 24h).

Non-functional, hackathon-tier:

- All provider calls **mocked** behind hexagonal ports — no live Ollama / OpenAI-compatible / OmniVoice / OpenAI-TTS.
- SPA + API + worker co-located in a single runnable service; SQLite file for job state.
- The six BDD `.feature` files in `docs/features/` pass end-to-end (live demo runs `@smoke` only).

## Out of scope (this sprint) — do NOT build

| Item | Where it goes |
|---|---|
| Combined workflow runtime (`translation+voiceover` chained execution) | Scaffolded only (schema/dispatch/persistence/WS envelope exist; runtime gated off). Combined `@integration @smoke` scenarios re-tagged `@defer-combined`. PRD Phase 3. |
| Live providers (Ollama, OpenAI-compatible, OmniVoice, OpenAI TTS) | Mocked adapters only. PRD Phase 4. |
| Job resumption UX (`POST /api/v1/jobs/{id}/resume`) | `last_chunk_id` persists; the resume endpoint + UI button are PRD Phase 4. |
| Full 3-active-jobs queue with overflow | Single-runner acceptable for the demo. PRD Phase 4. |
| OpenAI-compatible translation + standard OpenAI TTS adapters | PRD Phase 4. |
| Performance/security hardening, observability dashboard, nightly DB backup, production rollout | PRD Phase 5. |
| Multi-user auth/RBAC, long-term cloud storage, direct publishing, real-time/streaming, multi-file batch, translation memory/TMX | PRD Non-Goals (§2). |
| Explicit audio-language override control for multi-language Voice-Over-only | PRD §8 item 1 — deferred to a later UX decision. |
| Wall-clock KPIs (Translation <6 min / Voice-Over <9 min / Combined <13 min for a 10-chapter EPUB) | Demo-tier relaxed — correctness > speed for the sprint. |

## Filename convention

- Translation jobs: `[BookTitle]-[target_language].epub` where `[BookTitle]` is the **translated** title.
- Voiceover-only jobs: `[BookTitle]-[spoken_language].zip` where `[BookTitle]` is the **source** title (no translation occurred).
- Safe interpolation: strip path separators / control chars; canonicalize to a basename (three adversarial BDD titles in F6).

## PRD vs PROJECT.md

When the PRD and `.planning/PROJECT.md` conflict, **PROJECT.md wins for this sprint** (it is the sprint-scope overlay). PRD remains the source of truth for everything beyond the sprint.
