# SDD.md

# Software Design Document

## Purpose

This document describes the technical design of the YouTube transcription system and defines how each component should interact.

---

# System Modules

## 1. Configuration Module

### Responsibilities

* Load application configuration.
* Store default values.
* Allow overriding parameters.

### Configuration Parameters

| Parameter | Default |
|-----------|---------|
| timestamp_interval | 15 seconds |
| live_before_minutes | 3 |
| live_after_minutes | 3 |
| max_chunk_duration | 60 seconds |
| silence_detection | enabled |
| STT provider | OpenAI |
| STT model | whisper-1 |
| save_debug_audio | disabled |

---

## Debug Audio Module

### Responsibilities

When enabled, persist STT audio chunks for inspection and troubleshooting.

### Trigger

* Live stream STT pipeline
* Regular video STT fallback (subtitles unavailable)

Not used when subtitles are downloaded successfully.

### Output Location

```text
{output_dir}/debug_audio/{video_id}/
```

Default:

```text
output/debug_audio/{video_id}/
```

### Files

| File | Description |
|------|-------------|
| `chunk_000_0.0s-58.4s.wav` | Chunk WAV with start/end seconds in the name |
| `manifest.json` | Ordered chunk list with timing metadata |

### Configuration

| Source | Option |
|--------|--------|
| Environment | `SAVE_DEBUG_AUDIO=true` |
| CLI | `--save-debug-audio` |
| Settings | `save_debug_audio` in `app/config/settings.py` |

Default: disabled.

---

## 2. URL Module

### Responsibilities

* Validate YouTube URL.
* Extract video ID.
* Normalize URL.

### Input

YouTube URL

### Output

Video ID

---

## 3. Video Detection Module

### Responsibilities

Determine whether the video is:

* Live stream
* Regular video

### Output

```python
VideoType.LIVE
VideoType.REGULAR
```

---

## 4. Subtitle Module

### Responsibilities

Download YouTube subtitles.

### Workflow

1. Request subtitles.
2. Parse subtitles.
3. Merge subtitle fragments.
4. Generate timestamps every configurable interval.
5. Return transcript.

### Fallback

If subtitles do not exist:

Route processing to the Speech-to-Text pipeline.

---

## 5. Audio Extraction Module

### Responsibilities

Extract audio from YouTube live stream.

### Output

Audio stream.

---

## 6. Audio Chunking Module

### Responsibilities

Split audio into chunks.

### Rules

* Maximum duration: 60 seconds.
* Prefer silence detection.
* Never intentionally split in the middle of speech.
* Produce chunks with overlap only if required by future implementations.

### Output

Ordered list of audio chunks.

---

## 7. Speech-to-Text Module

### Responsibilities

Send chunks to an external STT API.

### Requirements

* Multilingual.
* API-based.
* No local model download.

### Input

Audio chunk.

### Output

Transcript segment.

---

## 8. Transcript Builder

### Responsibilities

Combine transcript segments.

### Responsibilities include

* preserve order
* remove duplicated text
* normalize whitespace
* merge timestamps

---

## 9. Timestamp Formatter

### Responsibilities

Produce timestamp blocks.

Default:

```
00:00
00:15
00:30
00:45
...
```

Timestamp interval must be configurable.

---

## 10. Output Module

Supported outputs:

* TXT
* JSON

Future:

* SRT
* VTT
* Markdown

---

# Processing Flow

## Regular Video

```text
User URL
      │
      ▼
Validate URL
      │
      ▼
Detect Video Type
      │
      ▼
Regular Video
      │
      ▼
Download Subtitles
      │
      ▼
Subtitles Found?
      │
 ┌────┴────┐
 │         │
Yes        No
 │         │
 ▼         ▼
Format     STT Pipeline
 │         │
 └────┬────┘
      ▼
Save Transcript
```

---

## Live Stream

```text
User URL
      │
      ▼
Validate URL
      │
      ▼
Detect Live Stream
      │
      ▼
Capture Audio
      │
      ▼
Split on Silence
      │
      ▼
STT API
      │
      ▼
Merge Transcript
      │
      ▼
Generate Timestamps
      │
      ▼
Save Transcript
```

---

# Error Handling

The system must gracefully handle:

* Invalid YouTube URL.
* Video unavailable.
* Private video.
* Age-restricted video.
* Missing subtitles.
* STT API timeout.
* STT API rate limit.
* Temporary network failures.
* Interrupted live stream.
* Empty transcript response.

---

# Design Principles

* Small independent modules.
* Single Responsibility Principle.
* Provider-independent STT implementation.
* Configuration-driven behavior.
* No duplicated processing.
* Easy replacement of STT providers.
* Easy extension with new output formats.

---

# Future Extensions

* Speaker diarization.
* Automatic language detection.
* Translation.
* Real-time streaming mode.
* Multiple STT providers.
* Batch processing.
* REST API.
* Web interface.
* Docker deployment.
* Monitoring and logging.

---

# Project Structure

project/
│
├── app/
│   ├── config/
│   │   └── settings.py                # Application configuration
│   │
│   ├── models/
│   │   └── schemas.py                 # Data models and DTOs
│   │
│   ├── services/
│   │   ├── youtube.py                 # YouTube metadata and stream handling
│   │   ├── subtitles.py               # Subtitle download and parsing
│   │   ├── audio.py                   # Audio extraction
│   │   ├── chunking.py                # Silence-based audio chunking
│   │   ├── stt.py                     # STT provider interface
│   │   └── transcript.py              # Transcript merging and formatting
│   │
│   ├── providers/
│   │   ├── openai.py                  # OpenAI STT API implementation
│   │   └── huggingface.py             # Optional future Hugging Face STT 
│   │
│   ├── utils/
│   │   ├── timestamps.py              # Timestamp utilities
│   │   ├── validators.py              # URL validation
│   │   └── logger.py                  # Logging utilities
│   │
│   └── main.py                        # Application entry point
│
├── tests/
│   ├── test_subtitles.py
│   ├── test_chunking.py
│   ├── test_stt.py
│   ├── test_transcript.py
│   └── test_pipeline.py
│
├── output/                            # Generated transcripts
│   └── debug_audio/                   # Optional STT chunk debug export
│
├── docs/
│   ├── VISION.md
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── SDD.md
│   └── SPRINTS.md
│
├── requirements.txt
├── .env.example
├── README.md
└── pyproject.toml

User URL
    ↓
pipeline.py
    ├── detect video type
    ├── subtitles OR STT
    ├── chunking
    ├── transcript merge
    └── save output

