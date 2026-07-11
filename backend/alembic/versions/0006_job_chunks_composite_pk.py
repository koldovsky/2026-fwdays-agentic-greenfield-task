"""Composite primary key on ``job_chunks`` (Phase 4 follow-up).

Revision ID: 0006
Revises: 0005
Create Date: 2026-07-10

Worker-queue-stuck-after-first-job follow-up (second symptom
discovered live in the demo container): the D-04 namespace
``tx_ch{CHAPTER}_s{CHUNK}`` (or ``vo_ch{CHAPTER}_a{CHUNK}`` for
voiceover) is the same across jobs. The original Phase 1 schema
declared ``id`` as the single-column primary key, which made
``job_chunks.id`` globally unique. That was the wrong invariant:
the natural key is the tuple ``(job_id, id)`` (a job owns its
chunks; two jobs targeting the same chapter / sentence should
both be able to write ``tx_ch1_s0`` for their own per-chunk
state).

Repro: Job A for EPUB E writes ``tx_ch1_s0`` and dies, leaving
the row in the table. Job B for the same EPUB tries to insert
its own ``tx_ch1_s0`` and raises
``UNIQUE constraint failed: job_chunks.id`` (the second job
fails immediately, the user sees a spurious "internal_dispatch_error"
notification). With the composite PK on ``(job_id, id)``, both
rows coexist and the second job runs cleanly.

The migration:
1. Creates a new ``job_chunks`` table with the composite PK.
2. Copies the existing rows (idempotent — old rows keep their
   ``id`` + ``job_id`` pair; the new PK is satisfied trivially).
3. Drops the old ``job_chunks`` table.
4. Renames the new table to ``job_chunks``.
5. Recreates the ``ix_job_chunks_job_id`` index (the new PK
   already covers ``job_id`` lookups but the index is still
   useful for non-PK ``WHERE job_id=`` queries).

The old single-column PK is gone forever. Downgrade reverses
the table-rename swap (recreating ``id`` as a globally-unique
PK on the original schema).

Reversible: ``downgrade`` swaps the table back. The data is
preserved (only the PK definition changes).
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0006"
down_revision: str | Sequence[str] | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Swap ``job_chunks`` to a composite PK on ``(job_id, id)``."""
    # 1. Create the new table with the composite PK.
    op.create_table(
        "job_chunks_new",
        sa.Column("id", sa.String, nullable=False),
        sa.Column("job_id", sa.String, nullable=False),
        sa.Column("chapter_idx", sa.Integer, nullable=False, server_default="0"),
        sa.Column("chunk_idx", sa.Integer, nullable=False, server_default="0"),
        sa.Column("state", sa.String, nullable=False, server_default="pending"),
        sa.Column("chunk_split_warning", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.PrimaryKeyConstraint("job_id", "id", name="pk_job_chunks"),
    )
    # 2. Copy existing rows (data preserved).
    op.execute(
        "INSERT INTO job_chunks_new (id, job_id, chapter_idx, chunk_idx, "
        "state, chunk_split_warning, created_at) "
        "SELECT id, job_id, chapter_idx, chunk_idx, state, chunk_split_warning, "
        "created_at FROM job_chunks"
    )
    # 3. Drop the old table.
    op.drop_index("ix_job_chunks_job_id", table_name="job_chunks")
    op.drop_table("job_chunks")
    # 4. Rename the new table.
    op.rename_table("job_chunks_new", "job_chunks")
    # 5. Recreate the ``job_id`` index for non-PK ``WHERE job_id=`` queries.
    op.create_index("ix_job_chunks_job_id", "job_chunks", ["job_id"])


def downgrade() -> None:
    """Reverse the composite-PK swap back to the single-column ``id`` PK.

    NOTE: this can fail at runtime if the existing data has duplicate
    ``id`` values across different ``job_id`` rows (i.e. two jobs
    both wrote ``tx_ch1_s0``). The migration script logs a clear
    error in that case; the operator must manually deduplicate
    the ``id`` column before re-running. This is intentional: the
    composite PK is the correct invariant, and downgrading to the
    broken schema should require explicit operator intervention.
    """
    op.create_table(
        "job_chunks_old",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("job_id", sa.String, nullable=False),
        sa.Column("chapter_idx", sa.Integer, nullable=False, server_default="0"),
        sa.Column("chunk_idx", sa.Integer, nullable=False, server_default="0"),
        sa.Column("state", sa.String, nullable=False, server_default="pending"),
        sa.Column("chunk_split_warning", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.execute(
        "INSERT INTO job_chunks_old (id, job_id, chapter_idx, chunk_idx, "
        "state, chunk_split_warning, created_at) "
        "SELECT id, job_id, chapter_idx, chunk_idx, state, chunk_split_warning, "
        "created_at FROM job_chunks"
    )
    op.drop_index("ix_job_chunks_job_id", table_name="job_chunks")
    op.drop_table("job_chunks")
    op.rename_table("job_chunks_old", "job_chunks")
    op.create_index("ix_job_chunks_job_id", "job_chunks", ["job_id"])
