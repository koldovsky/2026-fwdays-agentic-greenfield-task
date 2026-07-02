# PRD.md

# Product Requirements Document

## Objective

Build a YouTube transcription system that automatically selects the best transcription strategy depending on the type of YouTube content.

The system should provide accurate timestamped transcripts while minimizing processing cost whenever possible.

## User Story

As a user,

I provide a YouTube URL.

The system determines whether it is a live stream or a regular video and automatically chooses the appropriate transcription method.

I receive a transcript with timestamps without having to choose the processing mode manually.

## Functional Requirements

### 1. Input

The system accepts:

* YouTube video URL
* optional configuration parameters

### 2. Live Stream Detection

After receiving the URL, the system determines whether the content is:

* Live stream
* Regular video

### 3. Regular Video Processing

If the content is a regular YouTube video:

1. Download YouTube subtitles (captions) if available.
2. Save the transcript with timestamps.
3. Default timestamp interval is 15 seconds.
4. Timestamp interval must be configurable.

If subtitles are unavailable, the system should fall back to Speech-to-Text transcription.

### 4. Live Stream Processing

If the content is a live stream:

The system transcribes audio around the current live position.

Default configuration:

* 3 minutes before
* 3 minutes after

Both values must be configurable.

### 5. Speech-to-Text

For live streams (and fallback cases), the system:

* extracts audio
* splits audio into chunks
* sends chunks to an external multilingual STT API
* stores transcript with timestamps

### 6. Audio Chunking

Audio should be split into chunks up to one minute long.

Preferred strategy:

* split on silence
* avoid splitting inside words or sentences

### 7. Output

The system returns:

* transcript text
* timestamps
* metadata about the processing method used

## Non-Functional Requirements

* Multilingual support
* Configurable timing parameters
* API-based STT (no local model hosting)
* Stable processing of long live streams
* Modular architecture
* Easy future extension

## MVP

The MVP is complete when the system can:

* process a YouTube URL
* detect live vs regular video
* download subtitles for regular videos
* transcribe live streams
* generate timestamped transcripts
* use configurable timing parameters
