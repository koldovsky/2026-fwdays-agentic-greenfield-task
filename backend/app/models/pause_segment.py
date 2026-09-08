"""Discrete pause-segment model (architecture §2.1, FR-SESS-01).

Each pause a session took is one row here — pauses are **never merged**, so a
twice-paused session keeps two segments and a later metrics slice (004) can count
two interruptions. ``resumed_at > paused_at`` is a DB CHECK; the cross-table rule
"a pause lies within its session's ``[started_at, ended_at]``" is enforced in
``SessionService`` as a 422 (it spans two rows and cannot be a single-row CHECK).
Rows cascade-delete with their parent session (``ON DELETE CASCADE``).
"""

from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Identity, text
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class PauseSegment(Base):
    """One closed pause interval belonging to a saved session."""

    __tablename__ = "pause_segments"
    __table_args__ = (
        CheckConstraint("resumed_at > paused_at", name="ck_pause_segments_resume_after_pause"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    session_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    paused_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    resumed_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )
