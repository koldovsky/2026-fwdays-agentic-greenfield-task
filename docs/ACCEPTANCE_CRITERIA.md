# ACCEPTANCE_CRITERIA.md

# Acceptance Criteria

## General Criteria

The implementation is acceptable only if the system works according to `VISION.md`, `PRD.md`, `ARCHITECTURE.md`, and `SDD.md`.

The system must not introduce functionality that is not described in the documentation unless explicitly requested.

---

## 1. URL Input

### Accepted When

* The system accepts a YouTube URL as input.
* The system validates that the URL is a supported YouTube URL.
* The system extracts the correct video ID.
* Invalid URLs return a clear error message.

### Rejected When

* Non-YouTube URLs are silently accepted.
* Invalid URLs crash the application.
* The system cannot extract a valid video ID from a standard YouTube URL.

---

## 2. Video Type Detection

### Accepted When

* The system detects whether the URL points to:

  * a regular YouTube video
  * a YouTube live stream
* The detection result is used to choose the correct processing path.

### Rejected When

* Live streams and regular videos use the same hardcoded path.
* The detection result is ignored.
* The system cannot explain which processing path was selected.

---

## 3. Regular Video Subtitle Processing

### Accepted When

* For regular videos, the system first attempts to download YouTube subtitles.
* If subtitles are available, they are saved as the main transcript source.
* The transcript contains timestamps.
* The default timestamp interval is 15 seconds.
* The timestamp interval is configurable.

### Rejected When

* The system transcribes regular videos with STT before checking subtitles.
* Subtitles are saved without timestamps.
* Timestamp interval is hardcoded and cannot be changed.

---

## 4. Subtitle Fallback to STT

### Accepted When

* If subtitles are unavailable for a regular video, the system falls back to the STT pipeline.
* The fallback behavior is logged or returned in metadata.
* The final transcript still contains timestamps.

### Rejected When

* The system fails completely when subtitles are missing.
* The user receives no useful error or fallback result.
* The fallback path is hidden and impossible to verify.

---

## 5. Live Stream Processing

### Accepted When

* For live streams, the system uses the live transcription path.
* By default, the system processes:

  * 3 minutes before the target live moment
  * 3 minutes after the target live moment
* Both before/after values are configurable.
* The selected time window is included in metadata.

### Rejected When

* The 3-minute before/after values are hardcoded.
* The live stream is treated as a regular video.
* The system does not expose which live window was processed.

---

## 6. Audio Chunking

### Accepted When

* Audio is split into chunks no longer than 60 seconds by default.
* Maximum chunk duration is configurable.
* The system prefers silence-based chunking.
* The system avoids random cuts inside speech where possible.

### Rejected When

* Audio is split only by fixed random intervals.
* Chunks are longer than the configured maximum duration.
* Silence-based splitting is ignored without a clear fallback reason.

---

## 7. STT API Integration

### Accepted When

* The system uses an external multilingual STT API.
* The system does not download or host the STT model locally.
* STT provider and model name are configurable.
* API errors are handled gracefully.

### Rejected When

* A large STT model is downloaded locally.
* The provider/model is hardcoded everywhere.
* API failure crashes the whole application without a clear message.

---

## 8. Transcript Output

### Accepted When

* The system saves a transcript in at least TXT and JSON formats.
* The transcript contains timestamped text blocks.
* Output metadata includes:

  * source URL
  * video ID
  * video type
  * processing method
  * timestamp interval
  * STT provider/model when STT is used
  * live window settings when live transcription is used

### Rejected When

* Transcript is saved as plain text without timestamps.
* Metadata is missing.
* Output format is inconsistent across processing paths.

---

## 9. Configuration

### Accepted When

The following parameters are configurable:

* timestamp interval
* live before minutes
* live after minutes
* maximum chunk duration
* STT provider
* STT model
* silence detection enabled/disabled

### Rejected When

* Defaults are scattered across the codebase.
* Configuration is duplicated in multiple modules.
* Changing defaults requires editing business logic.

---

## 10. Tests

### Accepted When

Tests cover:

* YouTube URL validation
* video ID extraction
* video type routing
* subtitle processing
* STT fallback behavior
* timestamp formatting
* transcript output structure
* configuration overrides

### Rejected When

* Core routing logic has no tests.
* Tests require real long live streams by default.
* Tests depend on unstable external APIs without mocks.

---

## 11. Documentation Compliance

### Accepted When

* Implementation follows the documented project structure.
* Main behavior matches `PRD.md`.
* Architecture matches `ARCHITECTURE.md`.
* Module responsibilities match `SDD.md`.

### Rejected When

* Code introduces undocumented architecture.
* Modules mix unrelated responsibilities.
* Cursor-generated code invents new flows without updating documentation first.
