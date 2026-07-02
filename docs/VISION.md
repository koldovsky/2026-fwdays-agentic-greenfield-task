# VISION.md

## Project Vision

The goal of this project is to build a video transcription system focused on YouTube videos, with special support for YouTube live streams.

The system should provide timestamped transcripts for both regular YouTube videos and live broadcasts. For regular non-live videos, the system should primarily try to extract existing subtitles or captions. For live streams, the system should generate transcription from the audio stream using a multilingual Speech-to-Text model accessed through an external API.

The default STT provider is OpenAI Speech-to-Text API.

The system should not depend on one provider at the architecture level. The STT layer must remain provider-independent, so alternative providers such as Hugging Face can be added later if needed.

The system must not download or host large transcription models locally.

## Core Idea

The user provides a YouTube URL.

If the video is not a live stream and subtitles are available, the system downloads the subtitles and saves them with timestamps.

If the video is a live stream, the system captures the audio stream, splits it into short chunks, sends those chunks to an external STT API, and saves the resulting transcript with timestamps.

The default transcript timestamp interval should be 15 seconds, but this value must be configurable.

## Live Stream Transcription Approach

For live streams, the system should work with a configurable time window around the target point.

The default behavior is:

* transcribe 3 minutes before the target moment
* transcribe 3 minutes after the target moment

These values must be configurable so that future users can change the before/after window when submitting a YouTube URL.

## Audio Chunking Strategy

For better transcription quality, the audio should be split into chunks of up to 1 minute.

The preferred chunking strategy is silence-based splitting. The system should try to cut audio on pauses instead of cutting at random points, especially in the middle of words or sentences.

This may introduce a delay of several minutes, but that delay is acceptable because it improves transcript quality and makes the system more reliable for real-world use.

## Key Requirements

The system must:

* accept a YouTube URL as input
* detect whether the URL points to a live stream or a regular video
* extract subtitles for regular videos when available
* transcribe audio for live streams
* save transcripts with timestamps
* support a default timestamp interval of 15 seconds
* allow timestamp interval configuration
* use configurable before/after windows for live stream transcription
* split audio into chunks of up to 1 minute
* prefer silence-based audio chunking
* use an external multilingual STT API
* avoid downloading or hosting large STT models locally

## Out of Scope for the First Version

The first version should not focus on:

* building a user interface
* speaker diarization
* translation
* local model hosting
* advanced video analysis
* real-time word-by-word transcription
* full-scale production deployment

These features may be considered later after the core transcription workflow is stable.

## Success Criteria

The project is successful if it can:

* accept a YouTube URL
* correctly choose between subtitle extraction and live transcription
* produce a timestamped transcript
* process live audio in stable chunks
* avoid cutting audio in the middle of speech where possible
* use a multilingual STT API without downloading the model locally
* allow key timing parameters to be configured

## Long-Term Direction

The long-term goal is to create a reliable transcription pipeline for monitoring YouTube videos and live broadcasts.

The system should be simple, configurable, cost-aware, and suitable for further integration into media monitoring, analytics, reporting, and AI-based content processing workflows.
