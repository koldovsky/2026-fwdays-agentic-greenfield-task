from __future__ import annotations

from bot.messages import prefix_with_name

REMINDER_BODY = "час зважування — надішли /вага, коли будеш готова"


def format_reminder_message(display_name: str | None) -> str:
    return prefix_with_name(REMINDER_BODY, display_name)
