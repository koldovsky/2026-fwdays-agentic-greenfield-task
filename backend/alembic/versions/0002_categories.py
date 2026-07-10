"""categories: per-user time-tracking categories

Slice 002 (category CRUD). Creates the `categories` table per architecture §2.1:
a `user_id` FK to users, `name`/`color` (hex) NOT NULL, nullable `description`, and
`archived_at` for delete-as-archive (§7, O-4).

Hand-reviewed after drafting:
  * BIGINT GENERATED ALWAYS AS IDENTITY primary key + `created_at DEFAULT now()`,
    matching the 0001 table style.
  * `user_id` FK ON DELETE CASCADE — a deleted account's categories go with it
    (the test cleanup deletes only users and relies on this cascade).
  * the **partial** unique index `UNIQUE(user_id, name) WHERE archived_at IS NULL`
    (via `postgresql_where`) — active-name uniqueness per user, while archived rows
    never block a re-create; plus the `user_id` lookup index.

Revision ID: 0002_categories
Revises: 0001_auth_email
Create Date: 2026-07-10

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0002_categories"
down_revision: str | None = "0001_auth_email"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("color", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("archived_at", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_categories_user_id", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_categories"),
    )
    op.create_index("ix_categories_user_id", "categories", ["user_id"])
    # Partial unique index: one active (non-archived) name per user. Scoped to
    # user_id so two users may each own a "Work"; partial so an archived "Work"
    # never blocks a new active "Work".
    op.create_index(
        "uq_categories_user_active_name",
        "categories",
        ["user_id", "name"],
        unique=True,
        postgresql_where=sa.text("archived_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_categories_user_active_name", table_name="categories")
    op.drop_index("ix_categories_user_id", table_name="categories")
    op.drop_table("categories")
