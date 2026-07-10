"""Shared helpers for the immediate-write + compensating-restore undo (architecture §6).

The before-image writers (timer discard, session edit/delete) and the restore
reader (``UndoService``) agree on one JSON shape here, so a token written by one
is always readable by the other. ``datetime`` values are stored as ISO-8601
strings (JSONB holds JSON scalars, not Python datetimes) and parsed back on
restore. Tokens are opaque random values; the server validity is 10 seconds (the
UI shows 5 — the extra 5 absorbs clock/network skew).
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from app.models.session import Session

UNDO_TTL_SECONDS = 10
_TOKEN_BYTES = 32

ACTION_DISCARD = "discard"
ACTION_EDIT = "edit"
ACTION_DELETE = "delete"


def now_utc() -> datetime:
    """Timezone-aware current instant in UTC (sessions store UTC only)."""
    return datetime.now(timezone.utc)


def new_token() -> str:
    """An opaque, URL-safe random undo token (never a guessable sequential id)."""
    return secrets.token_urlsafe(_TOKEN_BYTES)


def undo_expiry(now: datetime) -> datetime:
    """The server-side expiry for a token created at ``now``."""
    return now + timedelta(seconds=UNDO_TTL_SECONDS)


def iso(value: datetime) -> str:
    """Serialize a datetime for JSONB storage."""
    return value.isoformat()


def parse_iso(value: str) -> datetime:
    """Parse a stored ISO-8601 datetime back into an aware datetime."""
    return datetime.fromisoformat(value)


def session_before_image(row: Session) -> dict[str, Any]:
    """Capture a saved session and its pause segments as a restorable before-image."""
    return {
        "session": {
            "id": row.id,
            "category_id": row.category_id,
            "started_at": iso(row.started_at),
            "ended_at": iso(row.ended_at),
            "notes": row.notes,
            "source": row.source,
        },
        "pauses": [
            {"paused_at": iso(pause.paused_at), "resumed_at": iso(pause.resumed_at)}
            for pause in row.pauses
        ],
    }
