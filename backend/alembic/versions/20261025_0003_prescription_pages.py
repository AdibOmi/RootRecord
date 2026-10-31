"""multi-page prescriptions

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-25
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "prescriptions",
        sa.Column("image_paths", postgresql.JSONB(), server_default="[]", nullable=False),
    )
    op.execute("UPDATE prescriptions SET image_paths = jsonb_build_array(image_path)")
    op.alter_column("prescriptions", "image_paths", server_default=None)
    op.drop_column("prescriptions", "image_path")


def downgrade() -> None:
    op.add_column("prescriptions", sa.Column("image_path", sa.String(255), nullable=True))
    # Only the first page survives a downgrade.
    op.execute("UPDATE prescriptions SET image_path = image_paths->>0")
    op.alter_column("prescriptions", "image_path", nullable=False)
    op.drop_column("prescriptions", "image_paths")
