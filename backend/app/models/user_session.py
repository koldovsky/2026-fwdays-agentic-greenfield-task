"""Server-side session model (architecture §8.2, spec 001 Open question #1)."""

from datetime import datetime

from sqlalchemy import BigInteger, ForeignKey, Identity, Text, text
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class UserSession(Base):
    """A persisted login session.

    ``token`` is the opaque 256-bit random value carried in the session cookie —
    distinct from the BIGINT identity ``id`` (spec 001 Open question #1). Lookups
    hit ``token``; ``expires_at`` drives the 30-day sliding expiry.
    """

    __tablename__ = "user_sessions"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )
