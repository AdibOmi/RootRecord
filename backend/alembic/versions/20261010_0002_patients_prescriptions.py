"""patients and scanned prescriptions

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-10
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

patient_sex = postgresql.ENUM("male", "female", "other", name="patient_sex", create_type=False)
prescription_status = postgresql.ENUM(
    "draft", "confirmed", name="prescription_status", create_type=False
)


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade() -> None:
    bind = op.get_bind()
    patient_sex.create(bind, checkfirst=True)
    prescription_status.create(bind, checkfirst=True)
    # Generated patient codes (P-00001) when the prescription carries none.
    op.execute("CREATE SEQUENCE IF NOT EXISTS patient_code_seq")

    op.create_table(
        "patients",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("patient_code", sa.String(40), nullable=False),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("age_years", sa.Integer(), nullable=True),
        sa.Column("sex", patient_sex, nullable=True),
        sa.Column("address", sa.String(255), nullable=True),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_patients")),
        sa.UniqueConstraint("patient_code", name=op.f("uq_patients_patient_code")),
    )
    op.create_index(op.f("ix_patients_phone"), "patients", ["phone"])
    # Fuzzy name matching when linking a scanned prescription to a patient.
    op.execute(
        "CREATE INDEX ix_patients_full_name_trgm ON patients USING gin (full_name gin_trgm_ops)"
    )

    op.create_table(
        "prescriptions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("status", prescription_status, nullable=False),
        sa.Column("patient_id", sa.Uuid(), nullable=True),
        sa.Column("created_by_id", sa.Uuid(), nullable=False),
        sa.Column("confirmed_by_id", sa.Uuid(), nullable=True),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("visit_date", sa.Date(), nullable=True),
        sa.Column("chief_complaint", sa.Text(), nullable=True),
        sa.Column("diagnosis", sa.Text(), nullable=True),
        sa.Column("procedures", postgresql.JSONB(), nullable=False),
        sa.Column("medications", postgresql.JSONB(), nullable=False),
        sa.Column("advice", postgresql.JSONB(), nullable=False),
        sa.Column("follow_up_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("image_path", sa.String(255), nullable=False),
        sa.Column("extracted", postgresql.JSONB(), nullable=True),
        sa.Column("extraction_error", sa.Text(), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["patient_id"], ["patients.id"],
            name=op.f("fk_prescriptions_patient_id_patients"), ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_id"], ["users.id"], name=op.f("fk_prescriptions_created_by_id_users")
        ),
        sa.ForeignKeyConstraint(
            ["confirmed_by_id"], ["users.id"], name=op.f("fk_prescriptions_confirmed_by_id_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_prescriptions")),
    )
    for column in ("status", "patient_id", "visit_date", "follow_up_date"):
        op.create_index(op.f(f"ix_prescriptions_{column}"), "prescriptions", [column])


def downgrade() -> None:
    op.drop_table("prescriptions")
    op.execute("DROP INDEX IF EXISTS ix_patients_full_name_trgm")
    op.drop_index(op.f("ix_patients_phone"), table_name="patients")
    op.drop_table("patients")
    op.execute("DROP SEQUENCE IF EXISTS patient_code_seq")
    bind = op.get_bind()
    prescription_status.drop(bind, checkfirst=True)
    patient_sex.drop(bind, checkfirst=True)
