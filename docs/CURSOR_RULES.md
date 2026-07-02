# CURSOR_RULES.md

# Cursor Rules

## Core Rule

Implement the project strictly according to:

* `VISION.md`
* `PRD.md`
* `ARCHITECTURE.md`
* `SDD.md`
* `ACCEPTANCE_CRITERIA.md`

Do not invent new product behavior unless explicitly requested.

If documentation and implementation conflict, update the documentation first or ask for clarification.

---

## Development Principles

* Keep modules small and focused.
* Follow the Single Responsibility Principle.
* Do not place business logic directly in `main.py`.
* Use `pipeline.py` as the orchestration layer.
* Keep provider-specific code inside `providers/`.
* Keep reusable business logic inside `services/`.
* Keep configuration centralized in `app/config/settings.py`.

---

## Project Structure Rules

Follow this structure:

```text
project/
│
├── app/
│   ├── config/
│   │   └── settings.py
│   │
│   ├── models/
│   │   └── schemas.py
│   │
│   ├── services/
│   │   ├── youtube.py
│   │   ├── subtitles.py
│   │   ├── audio.py
│   │   ├── chunking.py
│   │   ├── stt.py
│   │   └── transcript.py
│   │
│   ├── providers/
│   │   ├── openai.py                  # OpenAI STT API implementation
│   │   └── huggingface.py             # Optional future Hugging Face STT 
│   │
│   ├── utils/
│   │   ├── timestamps.py
│   │   ├── validators.py
│   │   └── logger.py
│   │
│   ├── pipeline.py
│   └── main.py
│
├── tests/
│   ├── test_subtitles.py
│   ├── test_chunking.py
│   ├── test_stt.py
│   ├── test_transcript.py
│   └── test_pipeline.py
├── output/
├── docs/
│   ├── VISION.md
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── SDD.md
│   └── SPRINTS.md
├── requirements.txt
├── .env.example
├── README.md
└── pyproject.toml
```

Do not create alternative structures unless the documentation is updated first.

---

## Configuration Rules

All defaults must be defined in `app/config/settings.py`.

Required configurable values:

* `timestamp_interval_seconds`
* `live_before_minutes`
* `live_after_minutes`
* `max_chunk_duration_seconds`
* `silence_detection_enabled`
* `stt_provider`
* `stt_model`
* `output_dir`
* `save_debug_audio`

Do not hardcode these values inside business logic.

---

## Pipeline Rules

The main processing pipeline must follow this logic:

```text
Input YouTube URL
    ↓
Validate URL
    ↓
Extract video ID
    ↓
Detect video type
    ↓
If regular video:
    try subtitles first
    if subtitles unavailable:
        use STT fallback
If live stream:
    use live STT pipeline
    ↓
Build timestamped transcript
    ↓
Save output
```

---

## Regular Video Rules

For regular videos:

1. Always try YouTube subtitles first.
2. Use STT only if subtitles are unavailable.
3. Preserve timestamps.
4. Apply configurable timestamp interval.
5. Store metadata about the selected method.

Do not transcribe regular videos with STT before checking subtitles.

---

## Live Stream Rules

For live streams:

1. Use STT transcription.
2. Default time window:

   * 3 minutes before target live moment
   * 3 minutes after target live moment
3. These values must be configurable.
4. Store selected live window in metadata.

Do not hardcode live window values outside configuration.

---

## Audio Chunking Rules

Audio chunking must:

* use maximum chunk duration from configuration
* default to 60 seconds
* prefer silence-based chunking
* avoid cutting inside speech where possible
* provide a fallback to fixed-length chunking if silence detection fails

Each chunk must preserve timing information.

When `save_debug_audio` is enabled, export chunk WAV files and `manifest.json` to `output/debug_audio/{video_id}/` before STT requests.

---

## STT Provider Rules

The STT layer must be provider-independent.

Use an interface or base service in:

```text
app/services/stt.py
```

Provider-specific implementation belongs in:

```text
app/providers/openai.py
```

The system must not download or host large STT models locally.

Use external API calls only.

Provider and model must be configurable.

---

## Output Rules

The system must save at least:

* `.txt`
* `.json`

JSON output must include:

* source URL
* video ID
* video type
* processing method
* transcript segments
* timestamp interval
* STT provider/model when used
* live window settings when used

---

## Testing Rules

Add or update tests for every implemented module.

Required test areas:

* URL validation
* video ID extraction
* video type routing
* subtitle processing
* fallback to STT
* timestamp formatting
* configuration overrides
* output structure

Tests should mock external APIs.

Do not require real long live streams in default tests.

---

## Error Handling Rules

Handle these cases explicitly:

* invalid URL
* unsupported URL
* unavailable video
* private video
* subtitles unavailable
* STT API timeout
* STT API rate limit
* empty STT response
* interrupted live stream
* file save error

Errors must be clear and actionable.

---

## Code Quality Rules

* Use type hints.
* Prefer pure functions where possible.
* Avoid global mutable state.
* Keep functions short.
* Avoid duplicated logic.
* Add docstrings for public functions.
* Keep external API calls isolated.
* Do not silently swallow exceptions.
* Do not print debug output in production code; use logging.

---

## Change Control

Before changing behavior:

1. Check the documentation.
2. Update the relevant `.md` file if needed.
3. Update tests.
4. Then update implementation.

The code must always remain aligned with the documentation.
