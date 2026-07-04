from __future__ import annotations

import re

_TIME_PATTERN = re.compile(r"^(\d{1,2}):(\d{2})$")


class ReminderTimeError(ValueError):
    """Raised when a reminder time string fails validation."""


def parse_reminder_time(raw: str) -> str:
    stripped = raw.strip()
    match = _TIME_PATTERN.match(stripped)
    if not match:
        raise ReminderTimeError("invalid_format")

    hour = int(match.group(1))
    minute = int(match.group(2))
    if hour > 23 or minute > 59:
        raise ReminderTimeError("out_of_range")

    return f"{hour:02d}:{minute:02d}"
