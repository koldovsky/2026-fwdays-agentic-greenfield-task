"""Job row provider + model columns (Phase 1 / BACK-09).

Revision ID: 0005
Revises: 0003
Create Date: 2026-07-08

Adds two new columns to the ``jobs`` table so the orchestrator (plan
01-03 / BACK-10) can read the stored provider + model and dispatch to
the matching per-provider subworkflow:

- ``provider`` (``VARCHAR(32)``, nullable, indexed) — the provider key
  (``"ollama"`` for translation; ``"openai-compatible"`` for translation
  + voiceover TTS). NULL for v1.1 legacy rows (the migration is
  additive; the legacy rows are loadable but undispatchable per the
  orchestrator's 422 guard).
- ``model`` (``VARCHAR(256)``, nullable, NOT indexed) — the model name
  (e.g. ``"translategemma:12b"``, ``"gpt-4o-mini"``, ``"tts-1"``).
  Not indexed because the model is not a query key (the orchestrator
  only filters on the provider + the job_type).

The columns are nullable for migration back-compat: existing v1.1
jobs rows have neither (the column is purely additive; no backfill).
New jobs always populate both (the Pydantic discriminated union's
per-variant ``extra="forbid"`` enforces the field on every variant).

Reversible: ``downgrade`` drops the two columns + the index.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0005"
down_revision: str | Sequence[str] | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add the ``provider`` + ``model`` columns to ``jobs`` (BACK-09)."""
    op.add_column(
        "jobs",
        sa.Column("provider", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "jobs",
        sa.Column("model", sa.String(length=256), nullable=True),
    )
    op.create_index("ix_jobs_provider", "jobs", ["provider"])


def downgrade() -> None:
    """Drop the ``provider`` + ``model`` columns + the provider index."""
    op.drop_index("ix_jobs_provider", table_name="jobs")
    op.drop_column("jobs", "model")
    op.drop_column("jobs", "provider")
