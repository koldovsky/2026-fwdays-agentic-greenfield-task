# Product Requirements Document — EPUB Translator & Voice-Over Platform

## 1. Introduction

### Document Purpose
This document outlines the requirements for the EPUB Translator & Voice-Over Platform and serves as the single source of truth for all stakeholders (engineering, design, leadership, marketing, sales). It captures the workflow-separation update: translation and voice-over are independent, peer workflows, optionally chainable into a combined job.

### Product/Feature Name
EPUB Translator & Voice-Over Platform (`epub-translator-voiceover-platform`)

### Version History

| Version | Date       | Author       | Changes                                                                                                                                                                                       |
|---------|------------|--------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1.0     | 2026-06-27 | Product Team | Initial PRD: EPUB upload, HTML-aware translation pipeline, voice-over as a tail step of translation, job management, export.                                                                  |
| 1.1     | 2026-07-03 | Product Team | Separate translation and voice-over into independent peer workflows. Add Voice-Over-only job type operating on original-language EPUB text; redefine F4 to consume EPUB text generally; add `job_type` discriminator; add top-level workflow chooser; re-phase release so each workflow ships independently; per-workflow KPIs; add mermaid sequence diagrams; add "voice-over without translation" differentiator. |
| 1.2     | 2026-07-03 | Product Team | Refine Voice-Over (F4): multi-language audio AC, TTS timeout AC; tighten F1/F2/F3/F5/F6 NFR clarity. |
| 1.3     | 2026-07-10 | Product Team | Add F7 Workflow Cancellation (Cancel button in active job view + `DELETE /api/v1/jobs/{id}` API) and F8 Navigation Back to Workflow Chooser (button visible only when the job is in a terminal state). Extend the job status vocabulary with `cancelled`; add the corresponding error codes (`job_not_cancellable`, `job_cancelled`). |

## 2. Vision & Goals

### Problem Statement
Readers, content creators, and accessibility users need to convert EPUB books between two distinct media transformations: (a) translate the text into another language while preserving HTML formatting and document structure, and (b) produce a spoken audio rendering of the book. Existing tools couple these transformations, require the user to translate before being allowed to voice-over, or only support pasted plain text rather than EPUB. Users who only want audio of an EPUB in its original language are forced through an unrelated translation step, and users who only want a translated EPUB are presented with audio configuration they will not use.

### Product Goals & Objectives
SMART targets for launch (measured over the first 3 months post-launch):

1. **HTML tag preservation:** ≥95% of structural HTML tags (paragraph, heading, list, emphasis, anchor) in the source EPUB are preserved in the translated EPUB output, validated by an automated tag-integrity diff.
2. **Translation-only speed:** average wall-clock time from job submission to translated EPUB download of **<6 minutes** for a 10-chapter EPUB at one Ollama provider call per sentence-bounded chunk.
3. **Voice-Over-only speed:** average wall-clock time from job submission to audio ZIP download of **<9 minutes** for a 10-chapter EPUB at 4096-char sentence-bounded TTS chunks.
4. **Combined speed:** average wall-clock time from job submission to both translated EPUB + audio ZIP download of **<13 minutes** for a 10-chapter EPUB (translation then voice-over of the translated text).
5. **Language coverage:** support **≥55 translation target languages** where the selected provider supports them (per-provider subset documented in Appendix A) and **≥600 TTS languages/voices** via OmniVoice and OpenAI TTS.
6. **Availability:** ≥99.5% monthly uptime of the web application and API, measured as successful HTTP responses to `GET /api/v1/health`.
7. **Adoption:** 1,000 monthly active users (MAU) within 3 months of launch, defined as users who submit at least one job.

### Success Metrics (KPIs)

| KPI                                              | Target                                   | Measurement Method                                                                  | Workflow Scope                                   |
|--------------------------------------------------|------------------------------------------|-------------------------------------------------------------------------------------|--------------------------------------------------|
| HTML tag preservation                             | ≥95% structural tags preserved           | Automated tag-integrity diff between source and translated EPUB                     | Translation-only, Combined                        |
| Job completion rate                              | ≥90% of started jobs reach `completed`   | Count of `completed` / (`completed` + `failed`) jobs per type in SQLite             | All three job types (tracked separately)         |
| 30-day user retention                            | ≥40% of first-week users return within 30 days | Distinct users with ≥1 job in week 1 and ≥1 job in next 30 days             | All                                              |
| Translation-only job time (10-chapter EPUB)      | <6 min average, P95 <9 min               | Wall-clock from `POST /jobs` acceptance to translated-EPUB ready event              | translation                                      |
| Voice-Over-only job time (10-chapter EPUB)        | <9 min average, P95 <13 min              | Wall-clock from `POST /jobs` acceptance to audio-ZIP ready event                    | voiceover                                        |
| Combined job time (10-chapter EPUB)               | <13 min average, P95 <18 min             | Wall-clock from `POST /jobs` acceptance to both-artifacts ready event                | translation+voiceover                            |
| Concurrent capacity                               | 3 active jobs + queue, 0 jobs rejected due to capacity when ≤3 active | Worker counters from SQLite                                                 | All                                              |
| Voice-Over-only language match                    | 100% of audio files match the EPUB's resolved primary declared language when the EPUB declares ≥1 language (resolved primary = highest-priority dc:language, or the first spine language) | Post-job metadata check                                          | voiceover, combined                              |
| Language coverage                                | ≥55 translation target languages and ≥600 TTS voices, counted per provider matrix at launch                    | Provider capability matrix audit at launch                    | translation, voiceover, combined                  |
| API independence assertion (voice-over decoupled) | 100% of `voiceover` jobs accepted with no translation fields present | Integration test asserting schema rejection is false                  | voiceover                                        |
| Monthly uptime                                    | ≥99.5%                                   | Uptime probe of `GET /api/v1/health`                                                | Platform                                         |

### Non-Goals
- **Real-time / streaming translation or voice-over** is out of scope for BOTH workflows. Jobs are batch-oriented; the user waits for completion. (Parity: streaming is excluded from translation AND voice-over.)
- **Translation memory, terminology glossaries, or TMX import/export** are out of scope.
- **Long-term cloud storage** of uploaded EPUBs or produced artifacts is out of scope. Files are deleted after download or a TTL.
- **Direct publishing** to retailers, library systems, or audiobook stores is out of scope.
- **Multi-file batch processing** is out of scope: one EPUB per job. The queue may hold multiple jobs but each processes a single EPUB.
- **Translation is NOT required to produce voice-over.** Voice-Over-only runs end-to-end without selecting a translation provider or language pair. (This is an explicit scope clarification, not a non-goal.)
- **Multi-user authentication / RBAC** is out of scope at launch; the platform is single-tenant anonymous. Recorded as an open question for later.

## 3. Target Audience & User Stories

### Target Users/Personas

**Primary persona — Language Learner**
- Needs: read foreign-language books in a language they understand, optionally listen to the translation for pronunciation practice.
- Behaviours: imports non-native EPUBs, chooses target language, optionally enables combined voice-over of the translated text.
- Motivations: comprehension and listening practice.

**Secondary persona — Content Creator / Audiobook Producer**
- Needs: produce audiobook audio of an EPUB, either in the original language (native-language audiobook) or in a translated language, with selectable accent, gender, and pitch.
- Behaviours: imports an EPUB, chooses **Voice-Over-only** for native-language audio or **Translation + Voice-Over** for translated audio, configures voice instructions.
- Motivations: content production throughput and voice customisation.

**Secondary persona — Accessibility User (visually impaired)**
- Needs: convert an EPUB in the language they already read into audio without an unnecessary translation step; the existing language is the language they want spoken.
- Behaviours: imports an EPUB, chooses **Voice-Over-only**, selects a TTS voice matching the EPUB's language, downloads audio.
- Motivations: access to written content in audio form, in their own language, with the least number of steps.

### User Stories/Use Cases

1. As a **Language Learner**, I want to translate an EPUB from Spanish to English and download the translated EPUB, so that I can read a foreign-language book in my own language.
2. As a **Content Creator**, I want to choose **Voice-Over-only** on an English-language EPUB with a British male, low-pitch voice, so that I can produce a native-language audiobook without performing any translation.
3. As an **Accessibility User**, I want to select **Voice-Over-only** on a French EPUB and download chapter-by-chapter audio in French, so that I can listen to a book I already read in its original language.
4. As a **Content Creator**, I want to choose **Translation + Voice-Over** to translate a German EPUB to English and voice-over the translated English text, so that I can produce a translated audiobook in one job.
5. As any **User**, I want to choose the workflow type (Translation / Voice-Over / both) at job creation from a top-level chooser, so that I am only presented with configuration relevant to my chosen workflow.
6. As any **User**, I want to resume an interrupted **Voice-Over-only** job from the last completed audio chunk, so that I do not lose progress if the browser or worker restarts.
7. As any **User**, I want to resume an interrupted **Translation-only** job from the last translated sentence-bounded chunk, so that re-runs do not duplicate work.
8. As an **Accessibility User**, I want the audio file names to reflect the spoken language (e.g. `[BookTitle]-[Language].mp3`), so that I can organise audio by language without opening each file.
9. As any **User**, I want to cancel a running or queued job from the active job view with a single button click, so that I can stop work I no longer need without waiting for the job to finish or fail on its own.
10. As any **User**, I want a "Back to chooser" button to appear once my job is completed, failed, cancelled, or expired, so that I can start a new workflow in one click without manually resetting the UI.

## 4. Features & Functionality

### Feature Overview
The platform comprises six features that compose into three peer workflows (Translation-only, Voice-Over-only, Translation + Voice-Over). F1 (Upload) precedes every workflow; F2/F3 are Translation-only; F4 is Voice-Over-only (input is the EPUB's text, original or translated); F5 manages all three job types via a `job_type` discriminator; F6 exports per-workflow artifacts.

### Detailed Feature Descriptions

| Feature | Name | Description | Dependencies | Assumptions |
|---------|------|-------------|--------------|-------------|
| F1 | EPUB Upload & Validation | Drag-drop or file picker; accepts EPUB 2.0/3.0; enforces ≤50MB; validates format; extracts metadata (title, author, declared language(s), chapter count) and reports it back to the chooser step. | None | The user possess a valid EPUB 2.0/3.0 file ≤50MB. |
| F2 | Translation Configuration | Source/target language selection (source defaulting to the EPUB's declared language; ≥55 target languages); provider selection (Ollama or OpenAI-compatible); model selection. Presented ONLY when the user selected Translation (alone or combined) in the chooser. | F1 | A translation provider endpoint is reachable; user supplies API key when an OpenAI-compatible provider is selected. |
| F3 | HTML-Aware Translation Pipeline | Translates chapter text in sentence-bounded chunks; preserves structural HTML tags; runs tag-integrity validation; emits per-chunk progress. This is the Translation-only core and the translation leg of the combined workflow. | F2, F1 | Source/target language pair is supported by the selected provider/model. |
| F4 | Voice-Over Generation | **REDEFINED:** a self-contained capability that consumes EPUB chapter text directly (original-language text for Voice-Over-only, or translated text for the Combined workflow). TTS provider selection (OmniVoice or standard OpenAI TTS); voice instructions (accent, gender, pitch); audio chunking at 4096-char sentence boundaries; per-sentence audio stitching into chapter files. Configuration is presented ONLY when the user selected Voice-Over (alone or combined). | F1 (for Voice-Over-only) or F3 (for Combined) | A TTS provider endpoint is reachable; user supplies API key when OpenAI TTS is selected. |
| F5 | Job Management & Persistence | Job state with a `job_type` discriminator (`translation` / `voiceover` / `translation+voiceover`); WebSocket progress within 1s; resumption from the last completed chunk; in-process queue limited to 3 active jobs with overflow queued. Job state, progress totals, and last-chunk-id are tracked per workflow so resumption is correct for each type. (Storage backend is an NFR/infra choice — see §6.) | F3 and/or F4 | A single process job store (SQLite on persistent volume — see §6 NFR row) is sufficient for the launch concurrency of 3 active jobs. |
| F6 | Export & Download | For `translation` jobs: translated EPUB download (`[BookTitle]-[target_language].epub`). For `voiceover` jobs: per-chapter audio + ZIP archive (`[BookTitle]-[spoken_language].zip`). For `translation+voiceover` jobs: both. The EPUB download is N/A for Voice-Over-only; audio file names reflect the spoken language. | F3 and/or F4 | The client can accept a ZIP download. |
| F7 | Workflow Cancellation | The user can stop any running (`active`) or `queued` job from the active job view via a single Cancel button click. The backend exposes a job-cancellation API that transitions the job to status `cancelled`, instructs the in-process worker to stop scheduling new chunks, and pushes a `{status:"cancelled"}` WebSocket event within 1s. Cancellation is best-effort: chunks already in-flight with the provider may complete before the worker stops. Partial artifacts on disk are retained for diagnostics but marked stale — the download endpoint returns HTTP 410 with `error.code = "job_cancelled"`. | F5 | The user understands that cancellation is best-effort; provider calls in flight may complete; previously emitted chunks are kept on disk but are not consumable as a job artifact. |
| F8 | Navigation Back to Workflow Chooser | Once a job has reached a terminal state (`completed`, `failed`, `cancelled`, or `expired`), the active job view exposes a "Back to chooser" button that returns the user to the top-level workflow chooser (Translation / Voice-Over / both) without a full page reload. While the job is still `active` or `queued`, the button is hidden (or disabled with a tooltip) so the user cannot abandon a running pipeline by accident. EPUBs already uploaded in the current browser session remain available for reuse after navigation. | F5, top-level workflow chooser view | The chooser destination is the same regardless of the prior job's `job_type`; navigation does not auto-start a new job and does not implicitly resume the previous one. |

### Acceptance Criteria (Given/When/Then)

**F1 — EPUB Upload & Validation**

1. **Given** the user opens the platform, **when** they drag-drop a file with `.epub` extension, **then** the file is accepted by the picker and an upload request is initiated.
2. **Given** a file is uploaded, **when** the file is not a valid EPUB 2.0/3.0 archive, **then** the API returns HTTP 422 with `error.code = "invalid_epub"` and the UI displays a parse-error message.
3. **Given** a file is uploaded, **when** the file size is **>50MB** (and `≤50MB` ⇒ accepted), **then** the API returns HTTP 413 with `error.code = "file_too_large"` and the UI rejects the file before upload completes.
4. **Given** a valid EPUB is uploaded, **when** metadata extraction runs, **then** the response includes `title`, `author`, `declared_languages[]`, and `chapter_count`.

**F2 — Translation Configuration**

1. **Given** the user selected "Translation" or "both" in the chooser, **when** the configuration step renders, **then** translation provider, model, source language, and target language fields are visible.
2. **Given** the user selected "Voice-Over" only in the chooser, **when** the configuration step renders, **then** NO translation provider, source language, or target language fields are rendered.
3. **Given** source language is unset, **when** the EPUB declares a single language, **then** the source language defaults to that language.
4. **Given** a Translation job is configured, **when** the EPUB declares **no** `dc:language`, **then** the user must select the source language explicitly; the job is NOT created until a source language is selected (`POST /api/v1/jobs` returns HTTP 422 with `error.code = "source_language_required"`).

**F3 — HTML-Aware Translation Pipeline**

1. **Given** a translation job is running, **when** the pipeline completes a chapter, **then** ≥95% of structural HTML tags — the canonical set `{<p> (paragraph), <h1>–<h6> (heading), <ul>/<ol>/<li> (list), <em>/<strong> (emphasis), <a> (anchor)}` — present in the source chapter are present in the translated chapter, where the numerator = number of tags matched by name **and** occurrence in the translated chapter, and the denominator = total count of the same tag set in the source chapter (validated by tag-integrity diff).
2. **Given** a chapter contains 100 sentences, **when** the pipeline processes it in sentence-bounded chunks, **then** the number of provider calls equals the number of chunks, each ≤ one provider request.
3. **Given** a provider call exceeds 60s, **when** the call has not returned, **then** the call is aborted and retried once; on second failure the chunk is marked `failed` and the job transitions to `failed` with `error.code = "provider_timeout"`.

**F4 — Voice-Over Generation (REDEFINED)**

1. **Given** a `voiceover` job request with no `translation` fields present, **when** the request is submitted to `POST /api/v1/jobs`, **then** the job is accepted (HTTP 202), persists with `job_type = "voiceover"`, and audio is generated in the EPUB's resolved primary declared language. *(This is the testable hinge of the workflow separation.)*
2. **Given** an EPUB that declares **exactly one** `dc:language`, **when** a Voice-Over-only job is created without an explicit audio-language selection, **then** the audio is generated in that single declared language.
3. **Given** an EPUB that declares **≥2** `dc:language` entries, **when** a Voice-Over-only job is created without an explicit audio-language selection, **then** the audio is generated in the spine / primary declared language — resolved to the highest-priority `dc:language` (or, when priority is ambiguous, the first language appearing in the spine); the resolved primary language is recorded on the job row and surfaced in the progress UI.
4. **Given** a Voice-Over-only job is running, **when** audio chunking processes chapter text, **then** each TTS request input is ≤4096 characters and ends at a sentence boundary.
5. **Given** a chapter's audio chunks are generated, **when** stitching completes, **then** the chapter audio file length equals the sum of chunk durations ±50ms and the file is encoded in the user-selected output format.
6. **Given** a Combined job, **when** translation of a chapter completes, **then** the voice-over pipeline consumes the translated chapter text (not the source chapter text) for TTS.
7. **Given** a TTS provider call exceeds 60s, **when** the call has not returned, **then** the call is aborted and retried once; on the second consecutive failure the chunk is marked `failed`, `last_chunk_id` is persisted, and the job transitions to `failed` with `error.code = "provider_timeout"` and is resumable via F5. *(Mirrors F3-AC3 for Voice-Over parity.)*

**F5 — Job Management & Persistence**

1. **Given** a job is created, **when** the `POST /api/v1/jobs` body contains `job_type`, **then** the persisted job row stores `job_type` exactly as one of `translation`, `voiceover`, `translation+voiceover`.
2. **Given** 3 jobs are already active, **when** a 4th job is submitted, **then** the 4th job is persisted with status `queued` and is NOT started until an active job finishes.
3. **Given** a `voiceover` job resumed after interruption, **when** the worker reads `last_chunk_id`, **then** audio generation resumes from the chunk after `last_chunk_id` and previously completed chunks are not regenerated.
4. **Given** a `translation` job resumed after interruption, **when** the worker reads `last_chunk_id`, **then** translation resumes from the sentence-bounded chunk after `last_chunk_id`.
5. **Given** a client has an open WebSocket on `/api/v1/jobs/{id}/events`, **when** a chunk completes, **then** the server pushes a JSON event `{job_id, job_type, chunk_id, progress_current, progress_total, status}` within 1s.

**F6 — Export & Download**

1. **Given** a `translation` job is `completed`, **when** the client calls `GET /api/v1/jobs/{id}/download?artifact=epub`, **then** the translated EPUB is served with filename `[BookTitle]-[target_language].epub`.
2. **Given** a `voiceover` job is `completed`, **when** the client calls `GET /api/v1/jobs/{id}/download?artifact=zip`, **then** a ZIP archive of per-chapter audio is served with filename `[BookTitle]-[spoken_language].zip`, and `?artifact=epub` returns HTTP 404 with `error.code = "artifact_not_applicable"`.
3. **Given** a `translation+voiceover` job is `completed`, **when** the client calls `?artifact=epub` and `?artifact=zip`, **then** both artifacts are downloadable and their filenames reflect target language and spoken language respectively.
4. **Given** files for a completed job, **when** the TTL (configured, default 24h) elapses without download, **then** the EPUB and audio files are deleted from scratch disk; the job row remains in SQLite with status `expired`.
5. **Given** the client requests a download, **when** the artifact is up to 500MB, **then** the first byte is served in **<2s** on a stable connection and the response uses `Transfer-Encoding: chunked` streaming (no buffering of the full artifact in memory).
6. **Given** the EPUB's `title` metadata is interpolated into a download filename, **when** the filename is constructed, **then** path separators (`/`, `\`) and ASCII control characters (`0x00`–`0x1F`, `0x7F`) in `[BookTitle]` are replaced with `_` before interpolation, and the resulting filename is a valid, single-segment basename.

**F7 — Workflow Cancellation**

1. **Given** a job is in status `active` or `queued`, **when** the user clicks the Cancel button in the active job view, **then** the SPA calls `DELETE /api/v1/jobs/{id}`, the button transitions to a disabled "Cancelling…" state, and the API responds with HTTP 202.
2. **Given** the backend receives `DELETE /api/v1/jobs/{id}` for a cancellable job, **when** the cancellation is processed, **then** the job status transitions to `cancelled`, the in-process worker stops scheduling new chunks, and a `{status:"cancelled"}` WebSocket event is pushed within 1s.
3. **Given** a job is in status `completed`, `failed`, `cancelled`, or `expired`, **when** the user attempts to cancel it (button click or `DELETE` API call), **then** the API returns HTTP 409 with `error.code = "job_not_cancellable"` and the SPA surfaces an inline error.
4. **Given** a `translation+voiceover` job is cancelled mid-pipeline, **when** the cancellation is processed, **then** any chapters already translated and any audio chunks already produced are retained on disk (marked stale), and `GET /api/v1/jobs/{id}/download` returns HTTP 410 with `error.code = "job_cancelled"` for every artifact.
5. **Given** a job has been cancelled, **when** the active job view renders, **then** the Cancel button is replaced by a "Back to chooser" button (per F8-AC1) and a confirmation message is displayed.

**F8 — Navigation Back to Workflow Chooser**

1. **Given** a job has reached a terminal state (`completed`, `failed`, `cancelled`, or `expired`), **when** the active job view renders, **then** a "Back to chooser" button is visible and enabled, and the user is one click away from the top-level workflow chooser.
2. **Given** a job is still in status `active` or `queued`, **when** the active job view renders, **then** no "Back to chooser" button is shown, OR the button is disabled with a tooltip explaining that the job must finish (or be cancelled via F7) before navigating away.
3. **Given** the user clicks the "Back to chooser" button, **when** the navigation runs, **then** the SPA routes to the top-level workflow chooser view (Translation / Voice-Over / both) without a full page reload, and any EPUBs already uploaded in the current browser session remain available for reuse.
4. **Given** the user has navigated back, **when** they configure and submit a new job, **then** the new submission is a fresh `POST /api/v1/jobs` with no implicit link (e.g. resume) to the prior job, and the prior job's `cancelled` status is preserved on the server.

## 5. Design & User Experience (UX)

### User and System Flows

The user begins every workflow with a top-level **workflow chooser** offering three peer options: **Translation**, **Voice-Over**, or **both**. The chooser is not a toggle buried inside translation configuration; it is a first-class selection that determines which configuration sections (F2 translation config, F4 voice-over config) are presented next. Translation is never a precondition for Voice-Over.

**Happy path**

```mermaid
sequenceDiagram
    participant U as User
    participant SPA as SPA
    participant API as REST/WS API
    participant W as Worker (in-process)
    participant TP as Translation Provider
    participant TTS as TTS Provider

    U->>SPA: Upload EPUB
    SPA->>API: POST /api/v1/epubs (EPUB file)
    API-->>SPA: {epub_id, title, declared_languages, chapter_count}
    U->>SPA: Select job_type = "translation+voiceover"
    U->>SPA: Configure translation (provider, model, src/tgt lang) AND voice-over (TTS provider, voice, format)
    SPA->>API: POST /api/v1/jobs {job_type:"translation+voiceover", epub_id, translation:{...}, voiceover:{...}}
    API->>W: enqueue(job)
    API-->>SPA: 202 {job_id, status:"queued"}
    SPA->>API: WS /api/v1/jobs/{id}/events
    W->>TP: translate chunk[1..N] (sentence-bounded)
    TP-->>W: translated chunks; W emits WS progress per chunk
    W->>TTS: synthesize translated chunk audio (4096-char sentence-bounded)
    TTS-->>W: audio chunks; W stitches to chapter files; emits WS progress
    W->>API: mark job completed; expose epub + audio ZIP artifacts
    API-->>SPA: WS event {status:"completed"}
    U->>SPA: Download translated EPUB and audio ZIP
```

**Error scenario — Voice-Over-only with provider timeout, then retry**

```mermaid
sequenceDiagram
    participant U as User
    participant SPA as SPA
    participant API as REST/WS API
    participant W as Worker
    participant TTS as TTS Provider

    U->>SPA: Upload EPUB (declared language = French)
    U->>SPA: Select job_type = "voiceover" (NO translation fields)
    SPA->>API: POST /api/v1/jobs {job_type:"voiceover", epub_id, voiceover:{...}}
    Note over API: schema accepted with no translation block
    API->>W: enqueue(job)
    API-->>SPA: 202 {job_id, status:"queued"}
    SPA->>API: WS /api/v1/jobs/{id}/events
    W->>TTS: synthesize chunk[k] ( input ≤4096 chars, ends at sentence boundary )
    TTS-->>W: no response within 60s
    W->>TTS: retry chunk[k] once
    TTS-->>W: no response within 60s
    W->>API: persist last_chunk_id = k-1; status = "failed", error.code = "provider_timeout"
    API-->>SPA: WS event {status:"failed", error:"provider_timeout"}
    U->>SPA: Click "Resume"
    SPA->>API: POST /api/v1/jobs/{id}/resume
    API->>W: resume after last_chunk_id
    W->>TTS: synthesize chunk[k] onwards
    TTS-->>W: audio chunks
    W->>API: status = "completed"
    API-->>SPA: WS event {status:"completed"}
    U->>SPA: Download ZIP [BookTitle]-[fr].zip
```

### Mockups/Wireframes
- Workflow chooser modal (three peer options, single-select): to be produced in Figma by design, referenced as `figma://epub-platform/chooser-v1`.
- Translation-only configuration panel: `figma://epub-platform/translation-config-v1`.
- Voice-Over-only configuration panel: `figma://epub-platform/voiceover-config-v1`.
- Combined configuration panel (both panels stacked): `figma://epub-platform/combined-config-v1`.
- Progress view (WebSocket-driven, chunk-level progress bar + log): `figma://epub-platform/progress-v1`.

## 6. Technical Requirements & Considerations

### High-Level Architecture
**Pattern:** Layered (n-tier) modular monolith with a Ports & Adapters (hexagonal) provider-abstraction layer and an event-driven in-process worker queue (SQLite-backed).

- **Presentation:** static SPA artifact (framework choice recorded as an ADR).
- **API/controllers:** REST + WebSocket API; `/api/v1/...` versioned (framework choice recorded as an ADR).
- **Application:** `JobOrchestrator` dispatches on `job_type`:
  - `translation` → `TranslationWorkflowService` (source EPUB → translated EPUB).
  - `voiceover` → `VoiceOverWorkflowService` fed by the EPUB's **original-language** text → audio.
  - `translation+voiceover` → `TranslationWorkflowService` then `VoiceOverWorkflowService` fed by the **translated** text.
- **Domain:** `TranslationPipeline`, `VoiceOverPipeline`, `EPUBModel`.
- **Infrastructure (adapters):** `OllamaTranslationAdapter`, `OpenAICompatibleTranslationAdapter`, `OmniVoiceTTSAdapter`, `OpenAITTSAdapter`, `SQLiteJobRepository`, `LocalFileStore`.

The workflow separation is **structural**, not merely a UI toggle: the two domain services are independent and either may be invoked alone. Project classification tags this deployment satisfies: `Web application`, `API backend`, `Frontend application`, `Worker service`. Deployment is a single backend container (API + worker co-located) plus a static SPA artifact; one SQLite file on a persistent volume.

### Integrations
- **EPUB/HTML parsing:** `ebooklib` + `BeautifulSoup4` (html5lib parser).
- **Sentence detection:** NLTK or spaCy — shared by both workflows (translation chunking AND 4096-char voice-over chunking).
- **Translation providers (ports):** Ollama, endpoint `/api/generate`; OpenAI-compatible, endpoint `/v1/chat/completions`. Only invoked for `translation` and `translation+voiceover` jobs.
- **TTS providers (ports):** OmniVoice, endpoint `/audio/speech` plus provider extensions; standard OpenAI TTS, endpoint `/audio/speech`. Only invoked for `voiceover` and `translation+voiceover` jobs.
- **Audio processing:** `pydub` for stitching per-sentence audio into chapter files and format conversion. Used by Voice-Over regardless of whether translation ran.

### Performance & Scalability

| Requirement                                           | Target                                       | Applies To                                 |
|-------------------------------------------------------|----------------------------------------------|--------------------------------------------|
| EPUB parse time (≤50MB)                               | <5s                                          | All jobs                                   |
| Translation throughput                                 | ≥50 sentences/min per active translation job | translation, translation+voiceover         |
| Chunk-level progress event latency                    | <1s from chunk completion to WS push         | All jobs                                   |
| Concurrent active jobs                                 | 3, with overflow queued                      | All jobs                                   |
| Max file size                                          | ≤50MB per EPUB                               | All jobs                                   |
| Max produced artifacts per job                         | <500MB (EPUB + audio)                        | All jobs                                   |
| Per-call provider timeout                              | 60s, single retry                            | All provider calls                         |
| Job state storage (NFR/infra)                          | SQLite (single file) on a persistent volume; WAL mode, single-writer; nightly backup | All jobs — F5 acceptance criteria are storage-agnostic; SQLite is the launch implementation |
| Translation-only wall-clock (10-chapter EPUB)         | avg <6 min, P95 <9 min                       | translation                                |
| Voice-Over-only wall-clock (10-chapter EPUB)          | avg <9 min, P95 <13 min                      | voiceover                                  |
| Combined wall-clock (10-chapter EPUB)                 | avg <13 min, P95 <18 min                     | translation+voiceover                      |
| Artifact download first-byte latency                  | <2s for a ≤500MB artifact on a stable connection; `Transfer-Encoding: chunked` streaming | All downloads (F6)                         |

Scalability posture is vertical-first; the in-process queue caps concurrency at 3 active jobs with overflow queued. No independent service scaling is required at launch (API and worker share a process).

### Security & Compliance
- **Threat model:**
  - Malicious EPUB (XXE, zip-bomb, polyglot): strict validation, ≤50MB size cap, sandboxed parsing.
  - API key leakage: translation/TTS API keys are session-only, never persisted in the DB, never logged.
  - Abusive provider usage: per-provider rate limiting; provider 429 responses are mapped to the API error envelope `error.code = "provider_rate_limited"`.
  - SSRF via user-supplied provider base URLs (Ollama / OpenAI-compatible): deny-list private IP ranges, enforce HTTPS on provider URLs.
- **Data privacy:** uploaded EPUBs and produced artifacts are stored on local scratch disk scoped to the job, deleted on completion, on download, or after a TTL (default 24h). No PII beyond what the EPUB contains. SQLite jobs DB stored on a persistent volume with nightly backup.
- **Transport:** HTTPS in production; CORS restricted to the SPA origin.
- **Compliance:** no regulatory regime is in scope at launch. Copyright of input EPUBs is the user's responsibility, recorded in T&Cs. Recorded as an open question.
- **Auth:** single-tenant anonymous at launch; no multi-user auth/RBAC. Recorded as an open question.

### Observability (gap-closure)
- Structured JSON logging from API and worker.
- Job-state metrics emitted from the worker: counts by status (`queued`, `active`, `completed`, `failed`, `cancelled`, `expired`) and by `job_type`; per-job latency histogram per type. Surfaced via an internal `/api/v1/internal/metrics` endpoint or via log scrape; not exposed to end users at launch.

### CI/CD & Infrastructure (gap-closure, non-blocking for launch)
- Containerised single-service deployment across dev/staging/prod.
- HTTPS everywhere; blue-green or rolling deploy.
- SQLite file on persistent volume; nightly backup of the jobs DB.

## 7. Release Plan & Milestones

### High-Level Timeline

| Phase | Weeks     | Deliverables                                                                                                                                                                                                     | Shippable Outcome                                                              |
|-------|-----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| 1     | 1–4       | EPUB upload & validation (F1); shared job scaffolding (F5 minimal with `job_type` discriminator); Translation-only MVP (F2, F3) with Ollama; translated EPUB download (F6 translation).                         | **Translation-only** end-to-end shippable.                                    |
| 2     | 5–8       | Voice-Over-only MVP (F4 redefined to consume EPUB text directly) with OmniVoice + audio stitching + per-chunk progress; audio ZIP download (F6 voiceover). Reuse shared job scaffolding; no translation coupling. | **Voice-Over-only** end-to-end shippable, independent of translation.          |
| 3     | 9–12      | Combined Translation+Voice-Over orchestration (F5 dispatch for `translation+voiceover`); both-artifact download. WebSocket progress across the chained pipeline.                                                | **Combined** workflow shippable.                                               |
| 4     | 13–16     | OpenAI-compatible translation provider + standard OpenAI TTS provider adapters; job resumption from `last_chunk_id`; full 3-active-jobs queue; UI polish; chooser UX.                                            | Provider port matrix complete; resilience UX complete.                         |
| 5     | 17–20     | Performance & security hardening; observability dashboard; docs; production rollout; nightly DB backup automation; launch.                                                                                       | **Production-ready** platform v1.1.                                           |

### Go-to-Market (GTM) Considerations
- **Messaging:** lead with "Translate OR voice-over an EPUB — your choice" to make the workflow separation the headline value; emphasise Voice-Over-only in original language for audiobook producers and accessibility users.
- **Marketing channels:** a 2-minute demo video showing the three peer chooser options, a landing page with each workflow as a distinct CTA, and one blog post titled "Voice-over an EPUB without translating it".
- **Support:** two FAQ entries — "Do I have to translate to get voice-over?" (No) and "Can I voice-over in the book's original language?" (Yes, choose Voice-Over-only).
- **Sales:** no inbound sales motion at launch (single-tenant, self-serve); record enterprise/multi-user interest as an open question.

## 8. Open Questions & Future Considerations

1. **Multi-language EPUBs for Voice-Over-only — explicit override:** the default audio language for multi-declared-language EPUBs is now codified in F4-AC3 (spine / primary declared language). The remaining open question is whether to expose an **explicit audio-language-selection** control in the Voice-Over configuration panel so a user can override the resolved primary (e.g., pick the second declared language); deferred to a UX decision in Phase 2 design.
2. **Chapter detection for Voice-Over-only without translation:** when the EPUB's spine has nested or non-standard chapter landmarks, how are chapters delineated for per-chapter audio files? Reuse `ebooklib` spine detection; confirm against the 10-chapter EPUB benchmark.
3. **Provider base URL validation:** exact deny-list (RFC1918, link-local, loopback, metadata endpoints) for user-supplied Ollama / OpenAI-compatible base URLs. Confirm minimum set.
4. **Multi-user authentication / RBAC:** single-tenant anonymous at launch; when does multi-user land? Coupled with long-term storage and direct publishing (out of launch scope).
5. **Copyright / T&Cs:** the platform does not vet EPUB copyright; the user attests to lawful use. Finalise legal wording before public launch.
6. **Translation provider model coverage:** the 55-language TranslateGemma matrix is provider-dependent; confirm Ollama and OpenAI-compatible models expose all 55 target languages at launch or document the per-provider subset.
7. **Real-time / streaming:** explicitly out of scope for both workflows at launch; revisit only if a streaming TTS provider is required by an accessibility partner.
8. **Batch multi-file processing:** out of scope (one EPUB per job); revisit after queue throughput data is available.

## 9. Appendices

### Appendix A — Translation Target Languages (≥55, via TranslateGemma)

Afrikaans, Albanian, Amharic, Arabic, Armenian, Assamese, Azerbaijani, Belarusian, Bengali, Bosnian, Bulgarian, Burmese, Catalan, Chinese (Simplified), Chinese (Traditional), Croatian, Czech, Danish, Dutch, English, Estonian, Finnish, French, Galician, Georgian, German, Greek, Gujarati, Hebrew, Hindi, Hungarian, Icelandic, Indonesian, Irish, Italian, Japanese, Javanese, Kannada, Kazakh, Khmer, Korean, Kurdish, Lao, Latvian, Lithuanian, Macedonian, Malay, Malayalam, Marathi, Nepali, Norwegian, Pashto, Persian, Polish, Portuguese (Brazil), Portuguese (Portugal), Punjabi, Romanian, Russian, Serbian, Sinhala, Slovak, Slovenian, Somali, Spanish, Sundanese, Swahili, Swedish, Tagalog, Tamil, Telugu, Thai, Turkish, Ukrainian, Urdu, Uzbek, Vietnamese, Welsh, Yoruba, Zulu.

(≥55 languages enumerated above; per-provider availability is an open question, see §8 item 6.)

### Appendix B — Voice-Instruction Formats

TTS voice instructions follow provider-specific formats:

- **English (comma+space separated):**
  - `female, american accent`
  - `male, british accent, low pitch`
  - `child, whisper`
- **Chinese (full-width comma separated):**
  - `女，河南话` (female, Henan dialect)
  - `男，四川话，中年` (male, Sichuan dialect, middle-aged)
  - `儿童，耳语` (child, whisper)

### Appendix C — Technology Specifications

| Area                | Specification                                                                                                                                                                  |
|---------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| EPUB format         | EPUB 2.0 / 3.0; validated via `ebooklib`                                                                                                                                       |
| HTML parsing        | `BeautifulSoup4` with `html5lib` parser                                                                                                                                       |
| Sentence detection  | NLTK (Punkt) or spaCy — shared across translation chunking and voice-over 4096-char chunking                                                                                   |
| Translation audio   | N/A — translation produces text only                                                                                                                                          |
| Audio formats       | OmniVoice: WAV16 / WAV24 / WAV32; OpenAI TTS: MP3 / OPUS / AAC / FLAC / WAV / PCM                                                                                            |
| SQLite schema       | `translation_jobs` (id, job_type, status, created_at, updated_at, source_language, target_language, provider_config_ref, tts_provider_config_ref, progress_current, progress_total, last_chunk_id, error). `job_type` ∈ {`translation`, `voiceover`, `translation+voiceover`}. `source_language`/`target_language` nullable for `voiceover`. `tts_*` nullable for `translation`. `job_state` checkpoint table per chunk (shared by both workflows). `audio_files` (job_id, chapter, file_path, format) populated only for `voiceover`/`translation+voiceover`. |
| WebSocket events    | JSON: `{job_id, job_type, chunk_id, progress_current, progress_total, status, error?}` pushed within 1s of chunk completion                                                     |
| REST API            | `POST /api/v1/jobs` (discriminated by `job_type`), `GET /api/v1/jobs/{id}`, `POST /api/v1/jobs/{id}/resume`, `DELETE /api/v1/jobs/{id}`, `GET /api/v1/jobs/{id}/download?artifact=epub\|audio\|zip`, `GET /api/v1/health` |
| Auth                | Single-tenant anonymous at launch; provider API keys session-only, never persisted                                                                                           |
| Error envelope      | `{error: {code, message, details?}}`; provider 429 → `error.code = "provider_rate_limited"`                                                                                   |

### Appendix D — Competitive Analysis & Key Differentiators

| Competitor     | Gap / Limitation                                                                                | Our Position                                                                                  |
|----------------|-------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| Google Translate | No EPUB HTML preservation; plain-text only; no audio.                                          | HTML-aware translation preserving structural tags; EPUB-native input/output.                  |
| DeepL          | No EPUB input; no audio.                                                                        | EPUB-native; ≥55 languages; combined voice-over option.                                       |
| Audible / audiobook producers | Pre-recorded audiobooks; no translation; no on-demand EPUB-to-audio.                           | On-demand Voice-Over-only from any EPUB in its original language; combined translation+voice-over; custom voice instructions. |

**Key differentiators:**
1. **Voice-over of an EPUB without translation** — generate audio of an EPUB in its original language without forcing a translation step; most tools either require translation first or only accept pasted plain text rather than EPUB. *(New in v1.1, the headline of the workflow separation.)*
2. HTML-aware translation preserving ≥95% of structural EPUB tags.
3. Custom-accent, gender, and pitch voice instructions (see Appendix B).
4. Local / private models via Ollama (no data leaves the user's machine when Ollama is used).
5. Resumable jobs from the last completed chunk per workflow (`translation`, `voiceover`, `translation+voiceover`).
6. Open provider architecture (Ports & Adapters): translation providers and TTS providers are pluggable; new providers are added as adapters without changing workflow logic.
7. Three peer workflows selectable from a first-class chooser, with per-workflow KPIs (Translation <6min / Voice-Over <9min / Combined <13min for a 10-chapter EPUB).
