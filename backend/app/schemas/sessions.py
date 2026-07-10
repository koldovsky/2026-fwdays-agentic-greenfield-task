"""Timer/session request + response schemas (Pydantic v2), separate from the ORM.

Requests validate shape/types only; the cross-field bounds rules (``ended_at >
started_at``, a pause within its session) are enforced in ``SessionService`` so
add and edit share one source of truth and return a clean ``422``. Responses
expose the derived ``gross_seconds``/``net_seconds`` (``app.core.durations``),
which are never stored. The ``from_orm_*`` builders map an ORM row onto the DTO.
"""

from datetime import datetime
from typing import TYPE_CHECKING, Annotated

from pydantic import BaseModel, Field, PlainSerializer

from app.core.durations import gross_seconds, net_seconds
from app.core.model import PauseData, SessionData

if TYPE_CHECKING:  # avoid a schema->model import cycle at runtime
    from app.models.active_session import ActiveSession
    from app.models.session import Session

_MAX_NOTES = 2000

# Serialize datetimes with Python's ISO-8601 (``+00:00`` offset, not ``Z``) so a
# response echoes the exact boundary a client sent — the round-trip a pause set
# is compared on. Applied on JSON serialization only; ``model_dump()`` (python
# mode) keeps datetimes so nested re-validation (SessionEditRead) still works.
IsoDatetime = Annotated[
    datetime,
    PlainSerializer(lambda value: value.isoformat(), return_type=str, when_used="json"),
]


class PauseInput(BaseModel):
    """One pause boundary supplied on manual add / edit."""

    paused_at: datetime
    resumed_at: datetime


class PauseRead(BaseModel):
    """One pause boundary returned in a session / active-session response."""

    paused_at: IsoDatetime
    resumed_at: IsoDatetime


# --- Timer action requests ----------------------------------------------------


class TimerStartRequest(BaseModel):
    """Body of ``POST /api/timer/start``."""

    category_id: int


class TimerVersionRequest(BaseModel):
    """Body of pause / continue / discard — carries the last-seen ``version``."""

    version: int


class TimerStopRequest(BaseModel):
    """Body of ``POST /api/timer/stop`` — the save-modal payload."""

    version: int
    category_id: int
    notes: str | None = Field(default=None, max_length=_MAX_NOTES)


# --- Session requests ---------------------------------------------------------


class SessionCreate(BaseModel):
    """Body of ``POST /api/sessions`` (manual add)."""

    category_id: int
    started_at: datetime
    ended_at: datetime
    notes: str | None = Field(default=None, max_length=_MAX_NOTES)
    pauses: list[PauseInput] = Field(default_factory=list)


class SessionUpdate(BaseModel):
    """Body of ``PATCH /api/sessions/{id}`` — every field optional (true PATCH).

    An absent field is left unchanged; ``pauses`` present (even ``[]``) replaces
    the whole pause set, while an absent ``pauses`` leaves the segments untouched.
    """

    category_id: int | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=_MAX_NOTES)
    pauses: list[PauseInput] | None = None


# --- Responses ----------------------------------------------------------------


class ActiveSessionRead(BaseModel):
    """Public shape of the live active timer."""

    id: int
    category_id: int
    started_at: IsoDatetime
    state: str
    pause_started_at: IsoDatetime | None
    accumulated_pauses: list[PauseRead]
    version: int

    @classmethod
    def from_orm_active(cls, row: "ActiveSession") -> "ActiveSessionRead":
        return cls(
            id=row.id,
            category_id=row.category_id,
            started_at=row.started_at,
            state=row.state,
            pause_started_at=row.pause_started_at,
            accumulated_pauses=[
                PauseRead(paused_at=pair["paused_at"], resumed_at=pair["resumed_at"])
                for pair in row.accumulated_pauses
            ],
            version=row.version,
        )


class SessionRead(BaseModel):
    """Public shape of a saved session, with derived gross/net durations."""

    id: int
    category_id: int
    started_at: IsoDatetime
    ended_at: IsoDatetime
    notes: str | None
    source: str
    gross_seconds: int
    net_seconds: int
    pauses: list[PauseRead]

    @classmethod
    def from_orm_session(cls, row: "Session") -> "SessionRead":
        data = SessionData(
            started_at=row.started_at,
            ended_at=row.ended_at,
            pauses=[PauseData(paused_at=p.paused_at, resumed_at=p.resumed_at) for p in row.pauses],
        )
        return cls(
            id=row.id,
            category_id=row.category_id,
            started_at=row.started_at,
            ended_at=row.ended_at,
            notes=row.notes,
            source=row.source,
            gross_seconds=gross_seconds(data),
            net_seconds=net_seconds(data),
            pauses=[PauseRead(paused_at=p.paused_at, resumed_at=p.resumed_at) for p in row.pauses],
        )


class SessionEditRead(SessionRead):
    """Edit response: the updated session plus the undo token for the notification."""

    undo_token: str


class UndoTokenResponse(BaseModel):
    """Discard / delete response: just the undo token."""

    undo_token: str
