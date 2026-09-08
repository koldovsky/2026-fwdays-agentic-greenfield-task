"""Undo before-image model (architecture §6, FR-NOTIF-01).

Undo is an immediate server write plus a compensating restore, not a delayed
commit: discard / edit / delete each execute now and write a full **before-image**
here. ``token`` is an opaque random value (``secrets.token_urlsafe``) used as the
``/api/undo/{token}`` path — never a guessable sequential id. A row is consumable
only while ``consumed_at IS NULL`` and ``expires_at > now`` (single-use, 10-second
server validity); after that the action has committed. ``before_image`` is JSONB
because the shape differs per action (active row vs. session + segments).
"""

from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, ForeignKey, Identity, Text, text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class UndoEntry(Base):
    """A single-use, expiring before-image for one undoable action."""

    __tablename__ = "undo_entries"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action: Mapped[str] = mapped_column(Text, nullable=False)
    before_image: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    token: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )
