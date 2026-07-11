"""Voice field for voiceover jobs (Phase 3 / D-06).

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-06

Adds a ``voice TEXT NULL`` column to ``jobs`` so voiceover jobs can
carry the chosen voice name (set at job creation by the router
preflight — D-06). The column is NULL-able because translation
jobs do NOT need a voice (the field is voiceover-only); existing
Phase 2 translation jobs that pre-date the column are unaffected
because they have no ``voice`` value; SQLite stores NULL by default.

Reversible: ``downgrade`` drops the column.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: str | Sequence[str] | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add the ``voice`` column to ``jobs`` (D-06)."""
    op.add_column(
        "jobs",
        sa.Column("voice", sa.Text, nullable=True),
    )


def downgrade() -> None:
    """Drop the ``voice`` column from ``jobs``."""
    op.drop_column("jobs", "voice")
