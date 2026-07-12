"""Coach persistence models (architecture §2.1, §4).

Two tables back the AI coach (slice 006):

- ``coach_messages`` — the one rolling chat thread per user (FR-COACH-03). Each row is a
  single ``user`` or ``coach`` turn; the ``(user_id, created_at)`` index serves the
  newest-first thread read the request assembler trims (§4.3). ``role`` is constrained to
  ``user|coach`` by a DB CHECK, mirroring the single-row CHECKs on ``sessions``.
- ``coach_insights`` — the read-through cache for the weekly insight card (FR-COACH-01,
  §2.1). ``week_start`` is the snapshot's user-TZ Monday (M2); ``UNIQUE(user_id,
  week_start)`` makes the cache one card per user per week, and ``payload`` is the §4.2
  card as JSONB (only a grounded, non-fallback card is ever stored).

Net/derived values are never stored here — the card payload is the model's structured
output, and the thread is the verbatim turns. Both FKs cascade on user delete.
"""

from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    Identity,
    Index,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import DATE, JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CoachMessage(Base):
    """One turn in a user's rolling coach thread (``user`` or ``coach``)."""

    __tablename__ = "coach_messages"
    __table_args__ = (
        CheckConstraint("role IN ('user', 'coach')", name="ck_coach_messages_role"),
        # The thread is read newest-first for a single user (§4.3 assembly); this
        # composite index also serves the user_id FK lookups (its leading column).
        Index("ix_coach_messages_user_created_at", "user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )


class CoachInsight(Base):
    """The cached weekly insight card for ``(user_id, week_start)`` (read-through, §2.1)."""

    __tablename__ = "coach_insights"
    __table_args__ = (
        # One cached card per user per week — the read-through cache key (B2/M2).
        UniqueConstraint("user_id", "week_start", name="uq_coach_insights_user_week"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    week_start: Mapped[date] = mapped_column(DATE, nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )
