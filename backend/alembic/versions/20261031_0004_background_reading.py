"""read prescriptions in the background; drop patient address

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-31
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "prescriptions", sa.Column("reading_started_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.drop_column("patients", "address")


def downgrade() -> None:
    op.add_column("patients", sa.Column("address", sa.String(255), nullable=True))
    op.drop_column("prescriptions", "reading_started_at")
