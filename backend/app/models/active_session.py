"""Live active-timer model (architecture §2.1, FR-TIMER-06).

The single server-authoritative in-progress timer per user — its own table, not
a ``sessions`` row with a null ``ended_at``, so saved-session queries never have
to filter an unfinished row. "At most one active session per user" is the DB
constraint ``UNIQUE(user_id)`` rather than application code: a second start
raises ``IntegrityError``. While running, a pause is the open interval
``pause_started_at``; ``continue`` closes it into ``accumulated_pauses`` (a JSONB
list of ``{paused_at, resumed_at}`` ISO pairs). ``version`` is the optimistic
concurrency token every timer action carries (a stale version is a 409).
"""

from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    ForeignKey,
    Identity,
    Integer,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ActiveSession(Base):
    """A user's in-progress timer (``running`` or ``paused``)."""

    __tablename__ = "active_sessions"
    __table_args__ = (
        # The single-active-session rule, enforced by the database.
        UniqueConstraint("user_id", name="uq_active_sessions_user_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    category_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    state: Mapped[str] = mapped_column(Text, nullable=False)
    pause_started_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    accumulated_pauses: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default=text("1")
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )
