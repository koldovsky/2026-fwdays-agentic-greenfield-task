from __future__ import annotations

MAX_DISPLAY_NAME_LENGTH = 40


class NameValidationError(ValueError):
    """Raised when a display name fails validation."""


def validate_display_name(raw: str) -> str:
    trimmed = raw.strip()
    if not trimmed:
        raise NameValidationError("empty")
    if len(trimmed) > MAX_DISPLAY_NAME_LENGTH:
        raise NameValidationError("too_long")
    return trimmed
