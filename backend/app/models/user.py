"""User account model (architecture §2.1)."""

from datetime import datetime

from sqlalchemy import BigInteger, Identity, Text, text
from sqlalchemy.dialects.postgresql import CITEXT, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class User(Base):
    """A registered account. Email is CITEXT so uniqueness is case-insensitive.

    ``password_hash`` is nullable for future OAuth-only accounts (slice 009);
    email/password registration always sets it.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    email: Mapped[str] = mapped_column(CITEXT, nullable=False, unique=True)
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    timezone: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'UTC'"))
    coach_language: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'en'"))
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )
