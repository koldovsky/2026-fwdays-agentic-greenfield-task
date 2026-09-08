"""auth email: users + user_sessions

Slice 001 (email + password auth). Creates the two auth tables per architecture
§2.1 (users) and §8.2 (user_sessions), and enables the citext extension so email
uniqueness is case-insensitive.

Hand-reviewed after drafting: citext extension enabled before the users table;
BIGINT GENERATED ALWAYS AS IDENTITY primary keys; the opaque `token` column is
distinct from the identity `id` (spec 001 Open question #1); indexes on the
session token (unique) and user_id foreign key.

Revision ID: 0001_auth_email
Revises:
Create Date: 2026-07-10

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_auth_email"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Case-insensitive email storage/uniqueness (architecture §2.1). Must exist
    # before the users.email CITEXT column is created.
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")

    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("email", postgresql.CITEXT(), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=True),
        sa.Column("timezone", sa.Text(), nullable=False, server_default=sa.text("'UTC'")),
        sa.Column("coach_language", sa.Text(), nullable=False, server_default=sa.text("'en'")),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )

    op.create_table(
        "user_sessions",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("token", sa.Text(), nullable=False),
        sa.Column("expires_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_user_sessions_user_id", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_user_sessions"),
        sa.UniqueConstraint("token", name="uq_user_sessions_token"),
    )
    op.create_index("ix_user_sessions_user_id", "user_sessions", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_user_sessions_user_id", table_name="user_sessions")
    op.drop_table("user_sessions")
    op.drop_table("users")
    # The citext extension is intentionally left installed: later slices depend on
    # it and dropping a shared extension in a per-table downgrade is unsafe.
