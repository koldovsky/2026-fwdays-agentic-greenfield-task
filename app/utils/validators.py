"""YouTube URL validation utilities."""

import re
from urllib.parse import parse_qs, urlparse

from app.exceptions import InvalidURLError

YOUTUBE_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
    "www.youtu.be",
}

VIDEO_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{11}$")


def validate_youtube_url(url: str) -> None:
    """Validate that the URL is a supported YouTube URL."""
    if not url or not url.strip():
        raise InvalidURLError("YouTube URL is required.")

    parsed = urlparse(url.strip())
    if parsed.scheme not in {"http", "https"}:
        raise InvalidURLError(f"Unsupported URL scheme: {parsed.scheme or 'missing'}")

    host = (parsed.netloc or "").lower()
    if host not in YOUTUBE_HOSTS:
        raise InvalidURLError(f"Unsupported URL host: {host or 'missing'}")


def extract_video_id(url: str) -> str:
    """Extract and return the YouTube video ID from a URL."""
    validate_youtube_url(url)
    parsed = urlparse(url.strip())
    host = parsed.netloc.lower()

    if host in {"youtu.be", "www.youtu.be"}:
        video_id = parsed.path.lstrip("/").split("/")[0]
    elif parsed.path == "/watch":
        query = parse_qs(parsed.query)
        video_id = query.get("v", [""])[0]
    elif parsed.path.startswith("/live/"):
        video_id = parsed.path.split("/live/")[1].split("/")[0]
    elif parsed.path.startswith("/shorts/"):
        video_id = parsed.path.split("/shorts/")[1].split("/")[0]
    elif parsed.path.startswith("/embed/"):
        video_id = parsed.path.split("/embed/")[1].split("/")[0]
    else:
        raise InvalidURLError(f"Unsupported YouTube URL format: {url}")

    if not VIDEO_ID_PATTERN.match(video_id):
        raise InvalidURLError(f"Could not extract a valid video ID from URL: {url}")

    return video_id


def normalize_youtube_url(url: str) -> str:
    """Normalize a YouTube URL to canonical watch form."""
    video_id = extract_video_id(url)
    return f"https://www.youtube.com/watch?v={video_id}"
