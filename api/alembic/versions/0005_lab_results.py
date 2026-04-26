"""lab_results table — P1a Patient Data Layer.

Revision ID: 0005_lab_results
Revises: 0004_vital_signs
Create Date: 2026-04-26

Hand-written (Principle II — no --autogenerate). Creates the lab_results
table with FK patient_id → patients.id ON DELETE CASCADE. is_critical is
server-computed and stored as BOOLEAN NOT NULL DEFAULT FALSE.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0005_lab_results"
down_revision = "0004_vital_signs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "lab_results",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "patient_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "patients.id", ondelete="CASCADE", name="fk_lab_results_patient_id"
            ),
            nullable=False,
        ),
        sa.Column(
            "test_name",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "value",
            sa.Numeric(precision=10, scale=4),
            nullable=False,
        ),
        sa.Column(
            "unit",
            sa.String(length=50),
            nullable=False,
        ),
        sa.Column(
            "reference_low",
            sa.Numeric(precision=10, scale=4),
            nullable=True,
        ),
        sa.Column(
            "reference_high",
            sa.Numeric(precision=10, scale=4),
            nullable=True,
        ),
        sa.Column(
            "is_critical",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("FALSE"),
        ),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.CheckConstraint("length(test_name) >= 1", name="ck_lab_results_test_name_len"),
        sa.CheckConstraint("length(unit) >= 1", name="ck_lab_results_unit_len"),
    )

    op.create_index(
        "ix_lab_results_patient_recorded",
        "lab_results",
        ["patient_id", sa.text("recorded_at ASC")],
    )
    op.create_index(
        "ix_lab_results_patient_test",
        "lab_results",
        ["patient_id", "test_name"],
    )


def downgrade() -> None:
    op.drop_index("ix_lab_results_patient_test", table_name="lab_results")
    op.drop_index("ix_lab_results_patient_recorded", table_name="lab_results")
    op.drop_table("lab_results")
