"""timer sessions: sessions + pause_segments + active_sessions + undo_entries

Slice 003 (the core timer + saved-session loop). Creates the four architecture
§2.1 tables the whole downstream (metrics, stats, heatmap, coach) reads from.

Hand-reviewed after drafting (matches the models field-for-field):
  * BIGINT GENERATED ALWAYS AS IDENTITY primary keys + `created_at DEFAULT now()`
    on every table, matching the 0001/0002 style.
  * every FK is ON DELETE CASCADE — deleting a user drops their sessions,
    active timer and undo rows; deleting a session drops its pause_segments
    (the test cleanup deletes only users and relies on these cascades).
  * `sessions`: CHECK `ended_at > started_at`; composite INDEX
    `(user_id, started_at)` for the newest-first log (also serves the user_id FK).
  * `pause_segments`: CHECK `resumed_at > paused_at`. The cross-table rule "a
    pause lies within its session's [started_at, ended_at]" is intentionally NOT
    a DB CHECK (it spans two rows); it is enforced in SessionService as a 422.
  * `active_sessions`: UNIQUE(user_id) is the single-active-session rule;
    `accumulated_pauses` JSONB NOT NULL DEFAULT '[]'; `version` INT DEFAULT 1.
  * `undo_entries`: `before_image` JSONB NOT NULL; `token` TEXT NOT NULL UNIQUE
    (opaque random, used as the /api/undo/{token} path).

Revision ID: 0003_timer_sessions
Revises: 0002_categories
Create Date: 2026-07-10

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0003_timer_sessions"
down_revision: str | None = "0002_categories"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "sessions",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("category_id", sa.BigInteger(), nullable=False),
        sa.Column("started_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("ended_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint("ended_at > started_at", name="ck_sessions_end_after_start"),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_sessions_user_id", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["categories.id"],
            name="fk_sessions_category_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_sessions"),
    )
    op.create_index("ix_sessions_user_started_at", "sessions", ["user_id", "started_at"])

    op.create_table(
        "pause_segments",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("session_id", sa.BigInteger(), nullable=False),
        sa.Column("paused_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("resumed_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        # resumed_at > paused_at is single-row and enforceable here; the "pause
        # within its session" rule spans sessions + pause_segments and is a 422
        # in SessionService, not a DB CHECK.
        sa.CheckConstraint(
            "resumed_at > paused_at", name="ck_pause_segments_resume_after_pause"
        ),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["sessions.id"],
            name="fk_pause_segments_session_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_pause_segments"),
    )
    op.create_index("ix_pause_segments_session_id", "pause_segments", ["session_id"])

    op.create_table(
        "active_sessions",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("category_id", sa.BigInteger(), nullable=False),
        sa.Column("started_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("state", sa.Text(), nullable=False),
        sa.Column("pause_started_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "accumulated_pauses",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("version", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_active_sessions_user_id", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["categories.id"],
            name="fk_active_sessions_category_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_active_sessions"),
        # The single server-authoritative active session per user (FR-TIMER-06).
        sa.UniqueConstraint("user_id", name="uq_active_sessions_user_id"),
    )

    op.create_table(
        "undo_entries",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("before_image", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("token", sa.Text(), nullable=False),
        sa.Column("expires_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("consumed_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_undo_entries_user_id", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_undo_entries"),
        sa.UniqueConstraint("token", name="uq_undo_entries_token"),
    )
    op.create_index("ix_undo_entries_user_id", "undo_entries", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_undo_entries_user_id", table_name="undo_entries")
    op.drop_table("undo_entries")
    op.drop_table("active_sessions")
    op.drop_index("ix_pause_segments_session_id", table_name="pause_segments")
    op.drop_table("pause_segments")
    op.drop_index("ix_sessions_user_started_at", table_name="sessions")
    op.drop_table("sessions")
