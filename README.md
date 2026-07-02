# YouTube Transcription System

A modular Python system for generating timestamped transcripts from YouTube videos and live streams.

## Features

- Accepts a YouTube URL and automatically detects live vs regular video
- Downloads existing subtitles for regular videos when available
- Falls back to external Speech-to-Text (STT) when subtitles are missing
- Transcribes live streams around a configurable time window (default: 3 minutes before/after)
- Splits audio into silence-aware chunks up to 60 seconds
- Uses OpenAI Whisper API for multilingual STT (no local model hosting)
- Saves output as `.txt` and `.json` with full metadata

## Requirements

- Python 3.11+
- [FFmpeg](https://ffmpeg.org/) (required by `yt-dlp` and `pydub`)

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env
```

Set `OPENAI_API_KEY` in `.env` for STT fallback and live transcription.

## Usage

```bash
python -m app.main "https://www.youtube.com/watch?v=VIDEO_ID"
```

Optional parameters:

```bash
python -m app.main "https://www.youtube.com/watch?v=VIDEO_ID" \
  --timestamp-interval 15 \
  --live-before 3 \
  --live-after 3 \
  --max-chunk-duration 60 \
  --stt-model whisper-1 \
  --output-dir output \
  --save-debug-audio
```

Disable silence-based chunking:

```bash
python -m app.main "URL" --no-silence-detection
```

## Output

Transcripts are saved to the `output/` directory:

- `{video_id}.txt` — human-readable timestamped transcript
- `{video_id}.json` — structured output with metadata

JSON includes: `source_url`, `video_id`, `video_type`, `processing_method`, `timestamp_interval_seconds`, `segments`, and `metadata` (STT provider/model or live window settings when applicable).

### Debug audio (STT only)

Enable with `--save-debug-audio` or `SAVE_DEBUG_AUDIO=true`. Chunks are written to:

```text
output/debug_audio/{video_id}/
  chunk_000_0.0s-58.4s.wav
  chunk_001_58.4s-120.0s.wav
  manifest.json
```

The manifest lists each chunk index, filename, and start/end/duration in seconds.

## Project Structure

```
app/
├── config/settings.py      # Centralized configuration
├── models/schemas.py       # Data models
├── services/               # Business logic modules
├── providers/openai.py
├── utils/
├── pipeline.py             # Orchestration layer
└── main.py                 # CLI entry point
tests/
output/
docs/
```

## Tests

```bash
pytest
```

Tests mock external APIs and do not require real live streams.

## Configuration

All defaults live in `app/config/settings.py` and can be overridden via environment variables or CLI flags. See `.env.example` for available options.
