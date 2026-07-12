"""coach: coach_messages + coach_insights

Slice 006 (the backend AI coach). Creates the two architecture §2.1 coach tables:
the rolling chat thread and the read-through weekly-insight cache. ``users.coach_language``
already exists (slice 001, migration 0001_auth_email) and is NOT re-added here.

Hand-reviewed after drafting (matches app/models/coach.py field-for-field):
  * BIGINT GENERATED ALWAYS AS IDENTITY primary keys + `created_at DEFAULT now()` on both
    tables, matching the 0001/0002/0003 style.
  * every FK is ON DELETE CASCADE — deleting a user drops their coach messages and insights
    (the test cleanup deletes users and relies on this cascade).
  * `coach_messages`: CHECK `role IN ('user','coach')`; composite INDEX
    `(user_id, created_at)` for the newest-first thread read (§4.3, also serves the FK).
  * `coach_insights`: `week_start` DATE NOT NULL (the user-TZ Monday), `payload` JSONB NOT
    NULL (the §4.2 card), UNIQUE `(user_id, week_start)` — the read-through cache key (B2).

Revision ID: 0004_coach
Revises: 0003_timer_sessions
Create Date: 2026-07-12

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0004_coach"
down_revision: str | None = "0003_timer_sessions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "coach_messages",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("language", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint("role IN ('user', 'coach')", name="ck_coach_messages_role"),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_coach_messages_user_id", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_coach_messages"),
    )
    op.create_index(
        "ix_coach_messages_user_created_at", "coach_messages", ["user_id", "created_at"]
    )

    op.create_table(
        "coach_insights",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("week_start", postgresql.DATE(), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_coach_insights_user_id", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_coach_insights"),
        sa.UniqueConstraint("user_id", "week_start", name="uq_coach_insights_user_week"),
    )


def downgrade() -> None:
    op.drop_table("coach_insights")
    op.drop_index("ix_coach_messages_user_created_at", table_name="coach_messages")
    op.drop_table("coach_messages")
