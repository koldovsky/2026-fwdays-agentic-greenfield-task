# ARCHITECTURE.md

# System Architecture

## High-Level Flow

```text
User
   │
   ▼
YouTube URL
   │
   ▼
Video Type Detector
   │
   ├──────────────┐
   │              │
Regular Video     Live Stream
   │              │
   ▼              ▼
Subtitle Loader   Audio Extractor
   │              │
   │              ▼
   │        Audio Chunker
   │              │
   │              ▼
   │      Multilingual STT API
   │              │
   └──────┬───────┘
          ▼
Timestamp Formatter
          │
          ▼
Transcript Output
```

## Components

### URL Processor

Responsible for:

* validating YouTube URLs
* extracting video ID

---

### Video Type Detector

Determines whether the URL represents:

* Live stream
* Regular video

---

### Subtitle Loader

For regular videos:

* downloads YouTube subtitles
* formats timestamps
* returns transcript

If subtitles are unavailable:

* redirects processing to the Speech-to-Text pipeline.

---

### Audio Extractor

For live streams:

* captures the audio stream
* prepares audio for transcription

---

### Audio Chunker

Responsibilities:

* split audio into chunks of up to one minute
* prefer silence-based chunking
* avoid cutting speech whenever possible

---

### STT Service

Responsibilities:

* send audio chunks to an external multilingual Speech-to-Text API
* receive transcript
* support configurable providers in the future

The system must never download or host transcription models locally.

---

### Timestamp Formatter

Converts transcript segments into configurable timestamp intervals.

Default interval:

* 15 seconds

Future versions may support different interval strategies.

---

### Configuration

Configurable parameters include:

* timestamp interval (default 15 seconds)
* minutes before live position (default 3)
* minutes after live position (default 3)
* maximum chunk length (default 60 seconds)
* silence detection parameters
* STT provider
* STT model
* debug audio export (optional)

## Debug Audio

When `save_debug_audio` is enabled (CLI: `--save-debug-audio`, env: `SAVE_DEBUG_AUDIO=true`), the STT pipeline writes each audio chunk sent to the API into:

```text
output/debug_audio/{video_id}/
```

Each run creates:

* `chunk_{index}_{start}s-{end}s.wav` — individual chunk files with preserved timing in the filename
* `manifest.json` — chunk index, filenames, start/end/duration in seconds

Debug audio is saved only during STT processing (live streams and regular-video STT fallback). Subtitle-only runs do not create debug files.

## Design Principles

* Automatic processing (minimal user input)
* Modular components
* Configurable behavior
* API-first integration
* Provider-independent STT layer
* Easy future extension
