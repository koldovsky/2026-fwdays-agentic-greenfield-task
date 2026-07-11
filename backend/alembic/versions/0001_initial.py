"""Initial migration: jobs / job_chunks / audio_files.

Revision ID: 0001
Revises:
Create Date: 2026-07-05

Creates the three SQLModel tables declared in
``epubtv.adapters.persistence.schema``. This migration constitutes the
**real DB write** for the walking-skeleton contract (Phase 1); querying
``sqlite_master`` to confirm the tables constitute the **real DB read**.

Column types align with SQLModel field types (Pattern 2). ``render_as_batch=True``
is set in ``alembic/env.py`` so future SQLite ALTER operations work.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create jobs / job_chunks / audio_files tables (Phase 1 schema)."""
    # jobs ----------------------------------------------------------------
    op.create_table(
        "jobs",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("epub_id", sa.String, nullable=False),
        sa.Column("job_type", sa.String, nullable=False),
        sa.Column("status", sa.String, nullable=False, server_default="queued"),
        sa.Column("target_language", sa.String, nullable=True),
        sa.Column("source_language", sa.String, nullable=True),
        # chapter_ids is a JSON-encoded list — TEXT affinity in SQLite.
        sa.Column("chapter_ids", sa.Text, nullable=False, server_default="[]"),
        sa.Column("last_chunk_id", sa.String, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_jobs_epub_id", "jobs", ["epub_id"])
    op.create_index("ix_jobs_job_type", "jobs", ["job_type"])
    op.create_index("ix_jobs_status", "jobs", ["status"])

    # job_chunks ----------------------------------------------------------
    op.create_table(
        "job_chunks",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("job_id", sa.String, nullable=False),
        sa.Column("chapter_idx", sa.Integer, nullable=False, server_default="0"),
        sa.Column("chunk_idx", sa.Integer, nullable=False, server_default="0"),
        sa.Column("state", sa.String, nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_job_chunks_job_id", "job_chunks", ["job_id"])

    # audio_files ---------------------------------------------------------
    op.create_table(
        "audio_files",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("job_id", sa.String, nullable=False),
        sa.Column("chapter", sa.Integer, nullable=False, server_default="0"),
        sa.Column("file_path", sa.String, nullable=False, server_default=""),
        sa.Column("fmt", sa.String, nullable=False, server_default="wav"),
    )
    op.create_index("ix_audio_files_job_id", "audio_files", ["job_id"])


def downgrade() -> None:
    """Drop the three tables in reverse FK / index order."""
    op.drop_index("ix_audio_files_job_id", table_name="audio_files")
    op.drop_table("audio_files")

    op.drop_index("ix_job_chunks_job_id", table_name="job_chunks")
    op.drop_table("job_chunks")

    op.drop_index("ix_jobs_status", table_name="jobs")
    op.drop_index("ix_jobs_job_type", table_name="jobs")
    op.drop_index("ix_jobs_epub_id", table_name="jobs")
    op.drop_table("jobs")
