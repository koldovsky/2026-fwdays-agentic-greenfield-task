"""Saved-session model (architecture §2.1, §2.2).

A completed time-tracking session owned by a user — either a live timer stop
(``source = 'timer'``) or a manual add (``source = 'manual'``). Net/gross are
**never stored**: they are derived at read time from ``started_at``/``ended_at``
and the discrete ``pause_segments`` (``app/core/durations.py``), so editing a
pause can never desynchronize a stored total. ``ended_at > started_at`` is a DB
CHECK; the session log query rides the composite ``(user_id, started_at)`` index.
"""

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    Identity,
    Index,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.pause_segment import PauseSegment


class Session(Base):
    """A user's saved session plus its discrete pause segments."""

    __tablename__ = "sessions"
    __table_args__ = (
        CheckConstraint("ended_at > started_at", name="ck_sessions_end_after_start"),
        # The log lists a user's sessions newest-first; this composite index also
        # serves the user_id FK lookups (its leading column), so no separate
        # user_id index is declared.
        Index("ix_sessions_user_started_at", "user_id", "started_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    category_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    ended_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )

    # Eager-loaded (async cannot lazy-load on attribute access) and cascade so
    # replacing the collection on edit deletes the orphaned segments.
    pauses: Mapped[list[PauseSegment]] = relationship(
        cascade="all, delete-orphan",
        order_by=PauseSegment.id,
        lazy="selectin",
    )
