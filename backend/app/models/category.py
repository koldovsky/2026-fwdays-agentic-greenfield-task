"""Category model (architecture §2.1, §7).

A per-user, flat (non-nested) time-tracking category. Delete is *archive*
(``archived_at`` set) so a session-referenced category stays a valid FK target
(section 7, O-4). Active uniqueness — one live category name per user — is the
partial index ``UNIQUE(user_id, name) WHERE archived_at IS NULL`` declared here
and created by migration ``0002_categories``.
"""

from datetime import datetime

from sqlalchemy import BigInteger, ForeignKey, Identity, Index, Text, text
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Category(Base):
    """A user's time-tracking category (name, color, optional description)."""

    __tablename__ = "categories"
    __table_args__ = (
        # Per-user active-name uniqueness. Partial (archived rows excluded) so a
        # user may archive "Work" and then create a fresh active "Work"; scoped
        # to user_id so two users may each own a "Work" (architecture §2.1).
        Index(
            "uq_categories_user_active_name",
            "user_id",
            "name",
            unique=True,
            postgresql_where=text("archived_at IS NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    color: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )
