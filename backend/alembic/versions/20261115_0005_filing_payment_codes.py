"""assistant files visits at payment; dentist verification; payment; 8-digit patient IDs

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-15
"""
import re
import secrets
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_CODE = re.compile(r"^[1-9]\d{7}$")


def upgrade() -> None:
    op.add_column("prescriptions", sa.Column("verified_by_id", sa.Uuid(), nullable=True))
    op.add_column("prescriptions", sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("prescriptions", sa.Column("billed_minor", sa.BigInteger(), nullable=True))
    op.add_column("prescriptions", sa.Column("paid_minor", sa.BigInteger(), nullable=True))
    op.create_foreign_key(
        op.f("fk_prescriptions_verified_by_id_users"), "prescriptions", "users", ["verified_by_id"], ["id"]
    )
    # Until now only dentists could file, so everything filed was checked by them.
    op.execute(
        "UPDATE prescriptions SET verified_by_id = confirmed_by_id, verified_at = confirmed_at "
        "WHERE status = 'confirmed'"
    )

    # Patient IDs become random 8-digit numbers (they double as the patient's sign-in,
    # so they must not be guessable). Replace any older free-form or P-00001 codes.
    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, patient_code FROM patients")).all()
    used = {code for _, code in rows}
    for patient_id, code in rows:
        if _CODE.match(code):
            continue
        while (new := str(10_000_000 + secrets.randbelow(90_000_000))) in used:
            pass
        used.add(new)
        bind.execute(
            sa.text("UPDATE patients SET patient_code = :code WHERE id = :id"),
            {"code": new, "id": patient_id},
        )
    op.execute("DROP SEQUENCE IF EXISTS patient_code_seq")


def downgrade() -> None:
    op.execute("CREATE SEQUENCE IF NOT EXISTS patient_code_seq")
    op.drop_constraint(op.f("fk_prescriptions_verified_by_id_users"), "prescriptions", type_="foreignkey")
    for column in ("paid_minor", "billed_minor", "verified_at", "verified_by_id"):
        op.drop_column("prescriptions", column)
