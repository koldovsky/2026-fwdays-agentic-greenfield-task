"""Application-specific exceptions."""


class TranscriptionError(Exception):
    """Base transcription error."""


class InvalidURLError(TranscriptionError):
    """Raised when a YouTube URL is invalid or unsupported."""


class NetworkError(TranscriptionError):
    """Raised when network or DNS connectivity fails."""


class VideoUnavailableError(TranscriptionError):
    """Raised when a video cannot be accessed."""


class PrivateVideoError(VideoUnavailableError):
    """Raised when a video is private."""


class AgeRestrictedVideoError(VideoUnavailableError):
    """Raised when a video is age-restricted."""


class SubtitlesUnavailableError(TranscriptionError):
    """Raised when subtitles cannot be downloaded."""


class STTError(TranscriptionError):
    """Base STT provider error."""


class STTTimeoutError(STTError):
    """Raised when STT API times out."""


class STTRateLimitError(STTError):
    """Raised when STT API rate limit is hit."""


class EmptySTTResponseError(STTError):
    """Raised when STT returns empty transcript."""


class LiveStreamInterruptedError(TranscriptionError):
    """Raised when live stream capture fails."""


class OutputSaveError(TranscriptionError):
    """Raised when transcript files cannot be saved."""
