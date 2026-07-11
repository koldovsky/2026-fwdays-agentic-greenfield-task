# Voice-Over Workflow

A user picks the **Voice-Over** card on the home page, fills in
`<VoiceoverConfigStep>` (OpenAI Base URL + API key + voice), and
clicks **Start voice-over**. The SPA `POST`s a `VoiceoverJobBody`
(`job_type="voiceover"`, `provider="openai-compatible"`, default
`model="tts-1"`, no translation fields) to `/api/v1/jobs`. The
FastAPI router auto-resolves `source_language` from
`EpubService.resolve_voiceover_language` (D-08 + D-09: single
declared → that language; ≥2 declared → first-spine chapter
`xml:lang`; 0 declared + no spine → 422 `source_language_required`),
validates `voice in VOICES_BY_LANGUAGE[source_language]`, persists
a `jobs` row (`status='queued'`, `voice`), and returns 202 +
`JobView`. The worker dequeues, `JobOrchestrator.dispatch`
instantiates a fresh `OpenAIHttpTTSAdapter` (bound to the row's
stored `model` + `voice` + the lifespan's OpenAI base URL), and
runs `VoiceOverWorkflowService` per-chunk. Each chunk is
synthesized to WAV bytes, persisted to `job_chunks` (with
`chunk_namespace='vo'`, optional `chunk_split_warning`), then
`AudioStitcher.stitch` concatenates per-sentence WAVs into a
per-chapter WAV written to `data/audio/{job_id}/ch{N}.wav` +
`audio_files` row. On completion, `ArtifactBuilder.build_audio_zip`
writes `{artifact_dir}/{job_id}/audio.zip`; the SPA streams the
ZIP from `GET /api/v1/jobs/{id}/download?artifact=zip`.

- **Entry endpoint:** `POST /api/v1/jobs` (voiceover variant)
- **Entry frontend component:** `<VoiceoverConfigStep>` (renders only when `?workflow=voiceover`)

```mermaid
flowchart TD
    %% ---------- Frontend (blue) ----------
    classDef fe fill:#dbeafe,stroke:#1e40af,color:#1e3a8a
    classDef feform fill:#bfdbfe,stroke:#1d4ed8,color:#1e3a8a
    classDef feapi fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
    classDef fehook fill:#c7d2fe,stroke:#4338ca,color:#312e81

    User([User])
    ChooserStep[ChooserStep<br/>reads ?workflow=voiceover]:::fe
    VoiceoverConfigStep["VoiceoverConfigStep<br/>.handleSubmit()"]:::feform
    UseCreateJob["useCreateJob (react-query)<br/>.mutate(VoiceoverJobBody)"]:::fehook
    ApiClient["api (axios)<br/>baseURL=NEXT_PUBLIC_API_BASE"]:::feapi
    UseJobView["useJobView<br/>GET /jobs/{id}"]:::fehook
    UseJobEvents["useJobEvents<br/>WS /jobs/{id}/events"]:::fehook
    JobStatusPanel["JobStatusPanel<br/>renders progress + ZIP download"]:::fe
    RouterPush[(router.push /jobs?id=…)]:::fe
    DownloadLink["&lt;a href=/jobs/{id}/download?artifact=zip&gt;"]:::fe

    User --> ChooserStep
    ChooserStep -->|renders when voiceover| VoiceoverConfigStep
    VoiceoverConfigStep -->|voiceoverConfigSchema.parse| UseCreateJob
    UseCreateJob -->|POST /jobs| ApiClient
    RouterPush -->|navigates| UseJobView
    UseJobView -->|"GET /jobs/{id}"| ApiClient
    UseJobEvents -.->|WS subscribe| JobEventsWS
    JobStatusPanel -->|uses| UseJobEvents

    %% ---------- API + validation (green) ----------
    classDef api fill:#dcfce7,stroke:#166534,color:#14532d
    classDef sch fill:#bbf7d0,stroke:#15803d,color:#14532d
    classDef pyd fill:#86efac,stroke:#16a34a,color:#14532d

    JobsRouter["jobs.router<br/>POST /api/v1/jobs<br/>create_job(body, request)"]:::api
    JobCreateBody["JobCreateBody<br/>(discriminated Union)"]:::sch
    VoiceoverJobBody["VoiceoverJobBody<br/>extra=forbid<br/>no translation fields<br/>(F4-AC1 + D-15)"]:::pyd
    PydValidation["Pydantic v2 parse<br/>→ 422 on stray fields"]:::pyd
    VOICES["VOICES_BY_LANGUAGE<br/>(epubtv.domain.voices)"]:::pyd
    ResolveLang["D-08 + D-09 preflight<br/>EpubService.resolve_voiceover_language<br/>or get_metadata.declared_languages"]:::api
    VoiceCatalogCheck["voice in VOICES_BY_LANGUAGE[lang]?<br/>(+ BACK-10 ollama-TTS reject)"]:::pyd
    VoiceProviderPreflight["provider must be openai-compatible<br/>422 validation_error otherwise"]:::api

    JobsRouter -->|Annotated Union parse| JobCreateBody
    JobCreateBody -->|job_type=voiceover| VoiceoverJobBody
    VoiceoverJobBody --> PydValidation
    PydValidation --> ResolveLang
    ResolveLang -->|1 declared → use| VoiceoverJobBody
    ResolveLang -->|0 + no chapter xml:lang| JobsRouter
    VoiceCatalogCheck -->|reads| VOICES
    JobsRouter --> VoiceCatalogCheck
    JobsRouter --> VoiceProviderPreflight

    %% ---------- Persistence (orange) ----------
    classDef db fill:#fed7aa,stroke:#9a3412,color:#7c2d12
    classDef dbtbl fill:#fdba74,stroke:#c2410c,color:#7c2d12

    JobRepo["SQLiteJobRepository<br/>(app.state.job_repo)"]:::db
    JobsTable[("jobs<br/>id, job_type='voiceover', status='queued'<br/>provider='openai-compatible'<br/>model='tts-1', voice, source_language")]:::dbtbl
    JobChunksTable[("job_chunks<br/>id=vo_ch{N}_a{M}<br/>state=completed/failed<br/>chunk_split_warning")]:::dbtbl
    AudioFilesTable[("audio_files<br/>chapter, file_path, fmt='wav'<br/>(D-16)")]:::dbtbl
    LastChunkId["jobs.last_chunk_id<br/>(JOBS-04 atomic commit)"]:::dbtbl

    JobsRouter -->|"job_repo.create_job(voice=…)" | JobRepo
    JobRepo -->|INSERT| JobsTable
    JobsRouter -->|return 202 + JobView| ApiClient

    %% ---------- Worker (red) ----------
    classDef wkr fill:#fecaca,stroke:#991b1b,color:#7f1d1d
    classDef orch fill:#fca5a5,stroke:#b91c1c,color:#7f1d1d
    classDef wf fill:#f87171,stroke:#dc2626,color:#7f1d1d

    WorkerSupervisor["worker_supervisor<br/>while True:<br/>count_active &lt; MAX_ACTIVE<br/>pop_next_queued()"]:::wkr
    PopQueued["pop_next_queued<br/>FIFO + atomic promote<br/>status: queued→running"]:::wkr
    SafeDispatch["_safe_dispatch<br/>catches HTTPException<br/>→ update_status('failed')"]:::wkr
    BuildOrch["_build_orchestrator<br/>reads app.state.tts_adapter_class,<br/>tts_base_url, default_voice"]:::wkr
    Orchestrator["JobOrchestrator.dispatch(job_id, 'voiceover')"]:::orch

    JobsTable -->|FIFO poll| WorkerSupervisor
    WorkerSupervisor --> PopQueued
    PopQueued -->|UPDATE status=running| JobsTable
    PopQueued --> SafeDispatch
    BuildOrch -->|constructs| Orchestrator
    SafeDispatch --> Orchestrator

    %% ---------- Orchestrator dispatch + per-dispatch TTS adapter (purple) ----------
    classDef adp fill:#e9d5ff,stroke:#6b21a8,color:#581c87
    classDef adpcol fill:#c4b5fd,stroke:#5b21b6,color:#3b0764

    LoadRow["get_job(job_id)<br/>→ provider, model, voice"]:::orch
    PerDispatch["tts_adapter_class<br/>(base_url, model, voice)<br/>.aclose() in finally"]:::adpcol
    OpenAITtsAdp["OpenAIHttpTTSAdapter<br/>.synthesize(chunk_id, text, src, tgt, voice)"]:::adp
    OpenAISDK["openai.AsyncOpenAI(base_url, api_key).audio.speech.create(model, voice, input, response_format='wav')"]:::adp

    Orchestrator --> LoadRow
    LoadRow --> PerDispatch
    PerDispatch --> OpenAITtsAdp
    OpenAITtsAdp --> OpenAISDK

    %% ---------- Workflow service (red) ----------
    BuildVoWF["_build_voiceover_workflow<br/>CharacterChunker()"]:::wf
    VoWF["VoiceOverWorkflowService<br/>.run(job_id)"]:::wf
    UpdateRunning["update_status('running')"]:::wf
    ListChunks["list_chunks(job_id)<br/>→ completed_set (resume D-10)"]:::wf
    ChaptersForEpub["EpubService.chapters_for_epub<br/>(filtered by chapter_ids)"]:::wf
    CharChunker["CharacterChunker<br/>.chunk(html, lang, ch_idx)<br/>3-tier fallback (D-04 + D-10)<br/>→ vo_ch{N}_a{M}"]:::wf
    Synthesize["asyncio.wait_for(60s) + 1 retry<br/>tts_port.synthesize(...)"]:::wf
    AppendChunk["append_chunk(state='completed',<br/>chunk_namespace='vo', chunk_split_warning=…)<br/>atomic + last_chunk_id"]:::wf
    EmitProgress["progress_bus.emit<br/>6-field envelope<br/>job_type='voiceover' (D-15)"]:::wf
    ChapterSegs["chapter_segs[ch_idx].append(audio_bytes)"]:::wf

    PerDispatch --> BuildVoWF
    BuildVoWF --> VoWF
    VoWF --> UpdateRunning
    UpdateRunning -->|UPDATE| JobsTable
    VoWF --> ListChunks
    ListChunks -->|SELECT| JobChunksTable
    VoWF --> ChaptersForEpub
    ChaptersForEpub --> CharChunker
    CharChunker --> Synthesize
    Synthesize -->|HTTP /v1/audio/speech| OpenAISDK
    OpenAISDK -->|returns WAV bytes + duration| Synthesize
    Synthesize --> AppendChunk
    AppendChunk -->|INSERT + UPDATE| JobChunksTable
    AppendChunk --> LastChunkId
    AppendChunk --> ChapterSegs
    AppendChunk --> EmitProgress

    %% ---------- Audio stitching (yellow) ----------
    classDef aud fill:#fef3c7,stroke:#92400e,color:#78350f
    classDef audfile fill:#fde68a,stroke:#b45309,color:#78350f

    AudioStitcher["AudioStitcher.stitch(ch_idx, segs)<br/>(pydub reduce+add)"]:::aud
    AudioOutPath["audio_dir / job_id / ch{N}.wav"]:::audfile
    RegisterAudio["register_audio_file(job_id, ch_idx,<br/>file_path, fmt='wav')<br/>(D-16)"]:::aud

    ChapterSegs -->|per chapter| AudioStitcher
    AudioStitcher -->|write bytes| AudioOutPath
    AudioOutPath --> RegisterAudio
    RegisterAudio -->|INSERT| AudioFilesTable

    %% ---------- Progress bus (green) ----------
    classDef bus fill:#a7f3d0,stroke:#047857,color:#064e3b

    ProgressBus["JobProgressBus<br/>(app.state.progress_bus)"]:::bus
    BusSubscribe["subscribe(job_id)→asyncio.Queue"]:::bus
    JobEventsWS["jobs.router.job_events<br/>WS /api/v1/jobs/{id}/events"]:::api

    EmitProgress --> ProgressBus
    ProgressBus -.->|per-subscriber queue| BusSubscribe
    BusSubscribe --> JobEventsWS
    JobEventsWS -.->|JSON frame| UseJobEvents

    %% ---------- Artifact pre-build (yellow) ----------
    UpdateCompleted["update_status('completed')<br/>+ terminal emit"]:::wf
    ArtifactBuilder["ArtifactBuilder.build_audio_zip<br/>(zipfile.ZipFile ZIP_DEFLATED)<br/>chapter_NN.wav entries"]:::art
    AudioZip[("audio.zip<br/>{artifact_dir}/{job_id}/")]:::art

    VoWF --> UpdateCompleted
    UpdateCompleted -->|UPDATE status=completed| JobsTable
    UpdateCompleted --> EmitProgress
    VoWF -->|gated on job_type=voiceover| ArtifactBuilder
    RegisterAudio --> ArtifactBuilder
    ArtifactBuilder -->|write| AudioZip

    %% ---------- Download (green) ----------
    classDef dl fill:#bbf7d0,stroke:#15803d,color:#14532d

    DownloadRouter["download.router<br/>download_artifact(job_id, artifact=zip)"]:::dl
    FilenameFor["_filename_for('zip', 'voiceover')<br/>→ 'audio.zip'"]:::dl
    SafeFilename["safe_filename(title, suffix='zip', lang=source)"]:::dl
    AiofilesStream["_stream_file via aiofiles<br/>64KB chunks (DL-03)"]:::dl
    ContentDisposition["Content-Disposition: attachment;<br/>filename*=UTF-8''…"]:::dl
    MediaType["media_type=application/zip"]:::dl

    DownloadLink -->|"GET /jobs/{id}/download?artifact=zip"| DownloadRouter
    DownloadRouter -->|get_job → status=completed| JobsTable
    DownloadRouter --> FilenameFor
    FilenameFor -->|path| AudioZip
    AudioZip -->|exists check| DownloadRouter
    DownloadRouter --> SafeFilename
    DownloadRouter -->|_content_disposition| ContentDisposition
    DownloadRouter --> AiofilesStream
    AiofilesStream -->|StreamingResponse| DownloadLink
    DownloadRouter --> MediaType
```

## Key entities (real names from source)

| Layer | File | Entity / method |
|---|---|---|
| Frontend form | `frontend/src/components/VoiceoverConfigStep.tsx` | `VoiceoverConfigStep.handleSubmit` → `useCreateJob.mutate({job_type:"voiceover",…})` |
| Frontend client | `frontend/src/lib/api.ts` | `api.post<JobView>("/jobs", body)` |
| Frontend polling | `frontend/src/hooks/useJobView.ts` + `useJobEvents.ts` | `GET /api/v1/jobs/{id}` + `WS /api/v1/jobs/{id}/events` |
| Router | `backend/src/epubtv/api/routers/jobs.py` | `create_job(body, request)` |
| Schema | `backend/src/epubtv/api/schemas.py` | `JobCreateBody` (Annotated Union) → `VoiceoverJobBody` (no translation fields, defaults `provider="openai-compatible"`, `model="tts-1"`) |
| Voice catalog | `backend/src/epubtv/domain/voices.py` | `VOICES_BY_LANGUAGE` |
| Source language | `backend/src/epubtv/application/epub_service.py` | `EpubService.resolve_voiceover_language` + `get_metadata` |
| Repo | `backend/src/epubtv/adapters/persistence/sqlite_job_repository.py` | `SQLiteJobRepository.create_job / get_job / update_status / append_chunk(chunk_namespace='vo') / list_chunks / register_audio_file` |
| Worker | `backend/src/epubtv/application/worker_queue.py` | `worker_supervisor` + `_build_orchestrator` + `_safe_dispatch` |
| Orchestrator | `backend/src/epubtv/application/job_orchestrator.py` | `JobOrchestrator.dispatch` (per-dispatch `OpenAIHttpTTSAdapter` construction; BACK-10 ollama-as-TTS reject) |
| Workflow | `backend/src/epubtv/application/voiceover_workflow.py` | `VoiceOverWorkflowService.run(job_id)` + `CharacterChunker` |
| Chunker | `backend/src/epubtv/domain/chunkers.py` | `CharacterChunker.chunk` (3-tier fallback: sentence → mid-sentence → hard cut with `chunk_split_warning`) |
| TTS adapter | `backend/src/epubtv/adapters/tts/openai_http_tts_adapter.py` | `OpenAIHttpTTSAdapter.synthesize` (uses `openai.AsyncOpenAI.audio.speech.create`) |
| Audio stitch | `backend/src/epubtv/adapters/audio/audio_stitcher.py` | `AudioStitcher.stitch(chapter_idx, audio_segments)` (pydub reduce+add) |
| ZIP build | `backend/src/epubtv/application/artifact_service.py` | `ArtifactBuilder.build_audio_zip` (`zipfile.ZipFile ZIP_DEFLATED`) |
| Download | `backend/src/epubtv/api/routers/download.py` | `download_artifact` + `safe_filename` + `aiofiles` 64KB stream |
