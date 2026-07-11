"""Voiceover chunk split warnings (Phase 3 / D-10).

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-06

Adds a ``chunk_split_warning TEXT NULL`` column to ``job_chunks`` so the
``CharacterChunker`` tier-3 hard-cut can record which chunks were split
by force. NULL means "normal chunk" (the column default); a string
value means "this chunk was split by the hard-cut tier because no
sentence / mid-sentence boundary fit in the 4096-char budget".

The column is NULL-able per the agent-discretion note in
``03-CONTEXT.md`` (simplest migration: existing Phase 2 jobs that
pre-date the column are unaffected because they have no
``chunk_split_warning`` value; SQLite stores NULL by default).

Reversible: ``downgrade`` drops the column.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: str | Sequence[str] | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add the ``chunk_split_warning`` column to ``job_chunks`` (D-10)."""
    op.add_column(
        "job_chunks",
        sa.Column("chunk_split_warning", sa.Text, nullable=True),
    )


def downgrade() -> None:
    """Drop the ``chunk_split_warning`` column from ``job_chunks``."""
    op.drop_column("job_chunks", "chunk_split_warning")
